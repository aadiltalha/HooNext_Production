import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { CheckCheck, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  return <NotificationsView audience="user" />;
}

export function NotificationsView({ audience }: { audience: "user" | "admin" }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: items = [] } = useQuery({
    queryKey: ["notifications-page", audience, user?.id],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
      q = audience === "admin" ? q.eq("audience", "admin") : q.eq("user_id", user!.id);
      return (await q).data ?? [];
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const ids = items.filter((n: any) => !n.read_at).map((n: any) => n.id);
      if (!ids.length) return;
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = items.filter((n: any) => !n.read_at).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
          <p className="text-sm text-muted-foreground mt-1">{unread > 0 ? `${unread} unread` : "You're all caught up."}</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAll.mutate()}>
            <CheckCheck className="h-4 w-4 mr-2" /> Mark all read
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-12 text-center">
          <BellOff className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <div className="font-medium">No notifications yet</div>
          <p className="text-sm text-muted-foreground mt-1">Order updates and messages will appear here.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm overflow-hidden">
          {items.map((n: any) => {
            const body = (
              <div className={cn("px-5 py-4 border-b border-border/50 last:border-b-0", !n.read_at && "bg-primary/5")}>
                <div className="flex items-start gap-3">
                  <div className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", n.read_at ? "bg-transparent border border-border" : "bg-primary")} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{n.title}</div>
                    {n.body && <div className="text-sm text-muted-foreground mt-1">{n.body}</div>}
                    <div className="text-[11px] text-muted-foreground mt-2">{formatDate(n.created_at)}</div>
                  </div>
                </div>
              </div>
            );
            return n.url ? <Link key={n.id} to={n.url as any} className="block hover:bg-accent/30">{body}</Link> : <div key={n.id}>{body}</div>;
          })}
        </div>
      )}
    </div>
  );
}
