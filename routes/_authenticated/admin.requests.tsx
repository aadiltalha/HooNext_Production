import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { ChevronRight, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { emailAboutMessage, notifyUser } from "@/lib/notify";

export const Route = createFileRoute("/_authenticated/admin/requests")({ component: AdminRequests });

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  in_progress: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
};

function AdminRequests() {
  const [chatRequest, setChatRequest] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: requests = [] } = useQuery({
    queryKey: ["admin-requests", filterStatus],
    queryFn: async () => {
      let q = supabase.from("site_update_requests")
        .select("*, customer_sites(site_name), profiles(full_name, email)")
        .order("created_at", { ascending: false });
      if (filterStatus !== "all") q = q.eq("status", filterStatus);
      return (await q).data ?? [];
    },
    refetchInterval: 60_000,
  });

  const counts = {
    pending: requests.filter((r: any) => r.status === "pending").length,
    in_progress: requests.filter((r: any) => r.status === "in_progress").length,
    completed: requests.filter((r: any) => r.status === "completed").length,
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Update Requests</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage and reply to customer change requests.</p>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending", key: "pending", color: "text-amber-400" },
          { label: "In Progress", key: "in_progress", color: "text-blue-400" },
          { label: "Completed", key: "completed", color: "text-emerald-400" },
        ].map(({ label, key, color }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
            className={cn(
              "rounded-xl border p-4 text-left transition-all",
              filterStatus === key ? "border-primary/60 bg-primary/5" : "border-border/70 bg-card/60 hover:border-primary/30"
            )}
          >
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className={cn("text-2xl font-bold mt-1", color)}>{counts[key as keyof typeof counts]}</div>
          </button>
        ))}
      </div>

      {/* Request list */}
      <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
        {requests.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No requests found.</div>
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
                    <span className="font-medium truncate">{r.title}</span>
                    <span className={cn("text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border", STATUS_COLORS[r.status] || "")}>
                      {r.status.replace("_", " ")}
                    </span>
                    {r.billable && (
                      <span className="text-[10px] uppercase px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-300 bg-amber-500/10">
                        Billable
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {r.profiles?.full_name || r.profiles?.email || "Customer"} · {r.customer_sites?.site_name || "—"} · {formatDate(r.created_at)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{r.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
              </button>
            ))}
          </div>
        )}
      </div>

      {chatRequest && (
        <AdminChatPanel
          request={chatRequest}
          onClose={() => setChatRequest(null)}
          onStatusChange={(updated) => setChatRequest(updated)}
        />
      )}
    </div>
  );
}

// ─── Admin chat panel ─────────────────────────────────────────────────────────
function AdminChatPanel({ request, onClose, onStatusChange }: {
  request: any;
  onClose: () => void;
  onStatusChange: (r: any) => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = useMutation({
    mutationFn: async () => {
      if (!msg.trim() || !user) return;
      const { data, error } = await supabase.from("request_messages").insert({
        request_id: request.id,
        user_id: user.id,
        body: msg.trim(),
        from_admin: true,
      }).select("id").single();
      if (error) throw error;
      void emailAboutMessage("request_reply", data?.id);
      // The customer is notified by a database trigger (no duplicate here).
    },
    onSuccess: () => {
      setMsg("");
      qc.invalidateQueries({ queryKey: ["request-messages", request.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { data, error } = await supabase.from("site_update_requests")
        .update({ status })
        .eq("id", request.id)
        .select()
        .single();
      if (error) throw error;
      await notifyUser(request.user_id, {
        title: `Request ${status.replace("_", " ")}: ${request.title}`,
        body: `Your update request status changed to ${status.replace("_", " ")}.`,
        url: "/dashboard/updates",
        type: "update",
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success("Status updated");
      onStatusChange(data);
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send.mutate(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-end p-0 sm:p-6">
      <div className="bg-background border border-border/70 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:w-[500px] h-[85vh] sm:h-[640px] flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 border-b border-border/60">
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{request.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {request.profiles?.full_name || request.profiles?.email || "Customer"} · {request.customer_sites?.site_name || "—"}
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full border border-border/60 flex items-center justify-center hover:bg-muted transition-colors shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Status changer */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-muted/30">
          <span className="text-xs text-muted-foreground shrink-0">Status:</span>
          <Select value={request.status} onValueChange={(v) => updateStatus.mutate(v)}>
            <SelectTrigger className="h-7 text-xs rounded-full border-border/60 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Original description */}
        <div className="px-4 py-3 bg-muted/20 border-b border-border/40 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Request: </span>{request.description}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8">No messages yet. Reply below to start the conversation.</div>
          )}
          {messages.map((m: any) => (
            <div key={m.id} className={cn("flex", m.from_admin ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                m.from_admin
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted text-foreground rounded-tl-sm"
              )}>
                {!m.from_admin && <div className="text-[10px] font-semibold mb-1 opacity-70">Customer</div>}
                <p className="leading-relaxed">{m.body}</p>
                <div className={cn("text-[10px] mt-1 opacity-60", m.from_admin ? "text-right" : "text-left")}>
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
              placeholder="Reply to customer… (Enter to send)"
              className="flex-1 rounded-full"
            />
            <Button
              size="icon"
              onClick={() => send.mutate()}
              disabled={!msg.trim() || send.isPending}
              className="rounded-full btn-gradient border-0 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


