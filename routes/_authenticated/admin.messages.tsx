import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { emailAboutMessage } from "@/lib/notify";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/messages")({ component: AdminMessages });

function AdminMessages() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const { data: messages = [] } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      const { data } = await supabase.from("support_messages").select("*").order("created_at", { ascending: true });
      const rows = data ?? [];
      const userIds = Array.from(new Set(rows.map((r: any) => r.user_id)));
      const { data: profiles = [] } = userIds.length
        ? await supabase.from("profiles").select("id,full_name,email").in("id", userIds)
        : { data: [] as any[] };
      const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      return rows.map((r: any) => ({ ...r, profile: map.get(r.user_id) }));
    },
    refetchInterval: 30_000,
  });

  const threads = Array.from(
    messages.reduce((acc: Map<string, any>, m: any) => {
      const existing = acc.get(m.thread_id);
      if (!existing) acc.set(m.thread_id, { thread_id: m.thread_id, subject: m.subject, last_at: m.created_at, last: m.body, user_id: m.user_id, profile: m.profiles });
      else if (new Date(m.created_at) > new Date(existing.last_at)) { existing.last_at = m.created_at; existing.last = m.body; }
      return acc;
    }, new Map()).values(),
  ).sort((a: any, b: any) => +new Date(b.last_at) - +new Date(a.last_at));

  useEffect(() => { if (!activeThread && threads.length) setActiveThread((threads[0] as any).thread_id); }, [threads, activeThread]);
  const thread = threads.find((t: any) => t.thread_id === activeThread) as any;
  const threadMessages = messages.filter((m: any) => m.thread_id === activeThread);

  const send = useMutation({
    mutationFn: async () => {
      if (!user || !thread || !reply.trim()) return;
      const { data, error } = await supabase.from("support_messages").insert({
        user_id: thread.user_id, thread_id: thread.thread_id, subject: thread.subject, body: reply, from_admin: true,
      }).select("id").single();
      if (error) throw error;
      void emailAboutMessage("support_reply", data?.id); // in-app notification comes from a DB trigger
    },
    onSuccess: () => { setReply(""); qc.invalidateQueries({ queryKey: ["admin-messages"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Support Messages</h2>
        <p className="text-sm text-muted-foreground mt-1">Respond to client conversations. New messages arrive live.</p>
      </div>
      <div className="grid md:grid-cols-[300px,1fr] rounded-2xl border border-border/70 bg-card overflow-hidden min-h-[540px]">
        <div className="border-r border-border/60 overflow-y-auto">
          {threads.length === 0 ? <div className="p-6 text-sm text-muted-foreground text-center">No conversations.</div> : threads.map((t: any) => (
            <button key={t.thread_id} onClick={() => setActiveThread(t.thread_id)}
              className={cn("w-full text-left px-4 py-3 border-b border-border/60 hover:bg-accent/40 transition-colors",
                activeThread === t.thread_id && "bg-accent/60")}>
              <div className="text-sm font-medium truncate">{t.subject}</div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">{t.profile?.full_name || t.profile?.email || "Client"}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{formatDate(t.last_at)}</div>
            </button>
          ))}
        </div>
        <div className="flex flex-col">
          {activeThread && thread ? (
            <>
              <div className="border-b border-border/60 px-6 py-3">
                <div className="font-semibold text-sm">{thread.subject}</div>
                <div className="text-xs text-muted-foreground">{thread.profile?.full_name || thread.profile?.email}</div>
              </div>
              <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                {threadMessages.map((m: any) => (
                  <div key={m.id} className={cn("flex", m.from_admin ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                      m.from_admin ? "bg-primary/15 border border-primary/30" : "bg-muted")}>
                      <div className="text-[10px] uppercase tracking-wider mb-1 opacity-70">{m.from_admin ? "You (Admin)" : "Client"} · {formatDate(m.created_at)}</div>
                      <div className="whitespace-pre-wrap">{m.body}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/60 p-3 flex items-end gap-2">
                <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply as admin…" className="min-h-[44px] max-h-32 resize-none" />
                <Button onClick={() => send.mutate()} disabled={!reply.trim() || send.isPending} className="btn-gradient border-0 h-11"><Send className="h-4 w-4" /></Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Select a conversation.</div>
          )}
        </div>
      </div>
    </div>
  );
}
