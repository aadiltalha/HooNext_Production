import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { emailAboutMessage } from "@/lib/notify";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { MessageSquare, Send, Lock, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/shared/page-loader";

export const Route = createFileRoute("/_authenticated/dashboard/support")({ component: SupportPage });

function SupportPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [newThread, setNewThread] = useState({ subject: "", body: "" });
  const [showNew, setShowNew] = useState(false);

  const { data: siteCount, isLoading: sitesLoading } = useQuery({
    queryKey: ["support-gate-sites", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("customer_sites").select("*", { count: "exact", head: true }).eq("user_id", user!.id)).count ?? 0,
  });

  const hasSite = (siteCount ?? 0) > 0;

  const { data: messages = [] } = useQuery({
    queryKey: ["support-messages", user?.id],
    enabled: !!user && hasSite,
    queryFn: async () => (await supabase.from("support_messages").select("*").eq("user_id", user!.id).order("created_at", { ascending: true })).data ?? [],
    refetchInterval: 30_000,
  });

  const threads = Array.from(
    messages.reduce((acc: Map<string, any>, m: any) => {
      const existing = acc.get(m.thread_id);
      if (!existing || new Date(m.created_at) > new Date(existing.last_at)) {
        acc.set(m.thread_id, { thread_id: m.thread_id, subject: existing?.subject || m.subject, last_at: m.created_at, last: m.body, from_admin: m.from_admin });
      } else if (!existing.subject) existing.subject = m.subject;
      return acc;
    }, new Map()).values(),
  ).sort((a: any, b: any) => +new Date(b.last_at) - +new Date(a.last_at));

  useEffect(() => {
    if (!activeThread && threads.length) setActiveThread((threads[0] as any).thread_id);
  }, [threads, activeThread]);

  const threadMessages = messages.filter((m: any) => m.thread_id === activeThread);

  const send = useMutation({
    mutationFn: async () => {
      if (!user || !activeThread || !reply.trim()) return;
      const subject = threads.find((t: any) => t.thread_id === activeThread)?.subject || "Support";
      const { data, error } = await supabase.from("support_messages").insert({
        user_id: user.id, thread_id: activeThread, subject, body: reply, from_admin: false,
      }).select("id").single();
      if (error) throw error;
      void emailAboutMessage("customer_message", data?.id);
    },
    onSuccess: () => { setReply(""); qc.invalidateQueries({ queryKey: ["support-messages"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const createThread = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (!newThread.subject.trim() || !newThread.body.trim()) throw new Error("Please fill in all fields");
      const { data, error } = await supabase.from("support_messages").insert({
        user_id: user.id, subject: newThread.subject, body: newThread.body, from_admin: false,
      }).select().single();
      if (error) throw error;
      void emailAboutMessage("customer_message", data?.id);
      return data;
    },
    onSuccess: (data: any) => {
      toast.success("Message sent — our team will get back to you shortly.");
      qc.invalidateQueries({ queryKey: ["support-messages"] });
      setShowNew(false);
      setNewThread({ subject: "", body: "" });
      if (data?.thread_id) setActiveThread(data.thread_id);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (sitesLoading) return <PageLoader message="Loading support" />;

  if (!hasSite) {
    return (
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold tracking-tight">Messages & Support</h2>
        <p className="text-sm text-muted-foreground mt-1">Support conversations become available after your first purchase.</p>
        <div className="mt-8 rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="text-lg font-semibold">No active websites yet</div>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Purchase a template to unlock priority messaging with our team. General questions? Use the contact form.
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <Button asChild className="btn-gradient border-0"><Link to="/marketplace"><ShoppingBag className="h-4 w-4 mr-2" /> Browse marketplace</Link></Button>
            <Button asChild variant="outline"><Link to="/contact">Contact us</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Messages & Support</h2>
          <p className="text-sm text-muted-foreground mt-1">Chat with our team in real time. Typical response within a few hours.</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="btn-gradient border-0"><MessageSquare className="h-4 w-4 mr-2" /> New conversation</Button>
      </div>

      {showNew && (
        <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-4">
          <div className="font-semibold">Start a new conversation</div>
          <div><Label>Subject</Label><Input className="mt-1" value={newThread.subject} onChange={(e) => setNewThread({ ...newThread, subject: e.target.value })} /></div>
          <div><Label>Message</Label><Textarea className="mt-1 min-h-[100px]" value={newThread.body} onChange={(e) => setNewThread({ ...newThread, body: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={() => createThread.mutate()} disabled={createThread.isPending} className="btn-gradient border-0">Send</Button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-[280px,1fr] gap-4 rounded-2xl border border-border/70 bg-card overflow-hidden min-h-[520px]">
        <div className="border-r border-border/60 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">No conversations yet.</div>
          ) : threads.map((t: any) => (
            <button key={t.thread_id} onClick={() => setActiveThread(t.thread_id)}
              className={cn("w-full text-left px-4 py-3 border-b border-border/60 hover:bg-accent/40 transition-colors",
                activeThread === t.thread_id && "bg-accent/60")}>
              <div className="text-sm font-medium truncate">{t.subject}</div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">{t.from_admin ? "Support: " : "You: "}{t.last}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{formatDate(t.last_at)}</div>
            </button>
          ))}
        </div>
        <div className="flex flex-col">
          {activeThread ? (
            <>
              <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                {threadMessages.map((m: any) => (
                  <div key={m.id} className={cn("flex", m.from_admin ? "justify-start" : "justify-end")}>
                    <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                      m.from_admin ? "bg-muted" : "bg-primary/15 border border-primary/30")}>
                      <div className="text-[10px] uppercase tracking-wider mb-1 opacity-70">{m.from_admin ? "Support" : "You"} · {formatDate(m.created_at)}</div>
                      <div className="whitespace-pre-wrap">{m.body}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/60 p-3 flex items-end gap-2">
                <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type a message…" className="min-h-[44px] max-h-32 resize-none" />
                <Button onClick={() => send.mutate()} disabled={!reply.trim() || send.isPending} className="btn-gradient border-0 h-11"><Send className="h-4 w-4" /></Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Select a conversation or start a new one.</div>
          )}
        </div>
      </div>
    </div>
  );
}
