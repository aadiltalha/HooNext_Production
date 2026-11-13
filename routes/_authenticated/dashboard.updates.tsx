import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { emailAboutMessage } from "@/lib/notify";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { Wrench, Sparkles, ChevronRight, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

const FREE_QUOTA_PER_YEAR = 5;

export const Route = createFileRoute("/_authenticated/dashboard/updates")({ component: UpdatesPage });

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  in_progress: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
};

function UpdatesPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [newOpen, setNewOpen] = useState(false);
  const [chatRequest, setChatRequest] = useState<any | null>(null);
  const [form, setForm] = useState({ title: "", description: "", site_id: "" });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites-min", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("customer_sites").select("id, site_name").eq("user_id", user!.id)).data ?? [],
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["update-requests", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("site_update_requests")
        .select("*, customer_sites(site_name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })).data ?? [],
  });

  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
  const usedFree = requests.filter((r: any) => !r.billable && new Date(r.created_at) >= new Date(yearStart)).length;
  const remaining = Math.max(0, FREE_QUOTA_PER_YEAR - usedFree);
  const nextBillable = remaining === 0;

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!form.title.trim() || !form.description.trim()) throw new Error("Please fill in all fields");
      const { data, error } = await supabase.from("site_update_requests").insert({
        user_id: user.id,
        site_id: form.site_id || null,
        title: form.title,
        description: form.description,
        billable: nextBillable,
        status: "pending",
      }).select().single();
      if (error) throw error;
      void emailAboutMessage("request_created", data?.id);
      return data;
    },
    onSuccess: (data) => {
      toast.success(nextBillable ? "Request submitted — this update is billable." : "Update request submitted.");
      qc.invalidateQueries({ queryKey: ["update-requests"] });
      setNewOpen(false);
      setForm({ title: "", description: "", site_id: "" });
      setChatRequest(data);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Website Update Requests</h2>
          <p className="text-sm text-muted-foreground mt-1">Request changes and chat with our team until you're happy.</p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="btn-gradient border-0">
          <Wrench className="h-4 w-4 mr-2" /> New request
        </Button>
      </div>

      {/* Quota card */}
      <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-6 flex items-center gap-4">
        <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Free updates this year</div>
          <div className="text-xs text-muted-foreground mt-0.5">{usedFree} of {FREE_QUOTA_PER_YEAR} used · additional updates billed at standard rate.</div>
        </div>
        <div className="text-2xl font-bold text-gradient">{remaining}<span className="text-sm text-muted-foreground font-normal"> left</span></div>
      </div>

      {/* Request list */}
      <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
        {requests.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No update requests yet.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {requests.map((r: any) => (
              <button
                key={r.id}
                onClick={() => setChatRequest(r)}
                className="w-full text-left p-5 flex items-start gap-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium truncate">{r.title}</div>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_COLORS[r.status] || ""}`}>
                      {r.status.replace("_", " ")}
                    </span>
                    {r.billable && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-300 bg-amber-500/10">
                        Billable
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {r.customer_sites?.site_name || "—"} · {formatDate(r.created_at)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{r.description}</p>
                  {r.admin_notes && (
                    <div className="mt-2 text-xs rounded-lg bg-muted/50 p-2">
                      <span className="font-medium">Admin: </span>{r.admin_notes}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New request dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New update request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Website</Label>
              <Select value={form.site_id} onValueChange={(v) => setForm({ ...form, site_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select a website" /></SelectTrigger>
                <SelectContent>
                  {sites.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.site_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input className="mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Change homepage hero image" />
            </div>
            <div>
              <Label>Describe your change</Label>
              <Textarea className="mt-1 min-h-[120px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What would you like changed?" />
            </div>
            {nextBillable && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 p-3 text-xs">
                You've used all {FREE_QUOTA_PER_YEAR} free updates this year. This request will be billed after review.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending} className="btn-gradient border-0">
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat panel */}
      {chatRequest && (
        <ChatPanel
          request={chatRequest}
          user={user}
          onClose={() => setChatRequest(null)}
        />
      )}
    </div>
  );
}

// ─── Chat panel ───────────────────────────────────────────────────────────────
function ChatPanel({ request, user, onClose }: { request: any; user: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["request-messages", request.id],
    queryFn: async () =>
      (await supabase.from("request_messages")
        .select("*")
        .eq("request_id", request.id)
        .order("created_at", { ascending: true })).data ?? [],
    refetchInterval: 30_000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useMutation({
    mutationFn: async () => {
      if (!msg.trim()) return;
      const { data, error } = await supabase.from("request_messages").insert({
        request_id: request.id,
        user_id: user.id,
        body: msg.trim(),
        from_admin: false,
      }).select("id").single();
      if (error) throw error;
      void emailAboutMessage("customer_request_message", data?.id);
    },
    onSuccess: () => {
      setMsg("");
      qc.invalidateQueries({ queryKey: ["request-messages", request.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send.mutate(); }
  };

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    in_progress: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    rejected: "bg-red-500/15 text-red-400 border-red-500/30",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-end p-0 sm:p-6">
      <div className="bg-background border border-border/70 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:w-[480px] h-[85vh] sm:h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 border-b border-border/60">
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{request.title}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border", STATUS_COLORS[request.status] || "")}>
                {request.status.replace("_", " ")}
              </span>
              <span className="text-xs text-muted-foreground">{formatDate(request.created_at)}</span>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full border border-border/60 flex items-center justify-center hover:bg-muted transition-colors shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Original description */}
        <div className="px-4 py-3 bg-muted/30 border-b border-border/40 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Original request: </span>{request.description}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8">
              No messages yet. Add details or ask our team a question below.
            </div>
          )}
          {messages.map((m: any) => (
            <div key={m.id} className={cn("flex", m.from_admin ? "justify-start" : "justify-end")}>
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                m.from_admin
                  ? "bg-muted text-foreground rounded-tl-sm"
                  : "bg-primary text-primary-foreground rounded-tr-sm"
              )}>
                {m.from_admin && <div className="text-[10px] font-semibold mb-1 opacity-70">HooNext Team</div>}
                <p className="leading-relaxed">{m.body}</p>
                <div className={cn("text-[10px] mt-1 opacity-60", m.from_admin ? "text-left" : "text-right")}>
                  {formatDate(m.created_at)}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border/60">
          <div className="flex gap-2">
            <Input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Add details or ask a question… (Enter to send)"
              className="flex-1 rounded-full"
              disabled={request.status === "completed" || request.status === "rejected"}
            />
            <Button
              size="icon"
              onClick={() => send.mutate()}
              disabled={!msg.trim() || send.isPending || request.status === "completed" || request.status === "rejected"}
              className="rounded-full btn-gradient border-0 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {(request.status === "completed" || request.status === "rejected") && (
            <p className="text-xs text-muted-foreground text-center mt-2">This request is {request.status}.</p>
          )}
        </div>
      </div>
    </div>
  );
}
