import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatUSD, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/subscription")({ component: Subs });

function Subs() {
  const { user } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ["subs", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("subscriptions")
      .select("*, customer_sites(site_name)").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div className="max-w-4xl space-y-4">
      <div><h2 className="text-2xl font-bold tracking-tight">Subscriptions</h2>
        <p className="text-sm text-muted-foreground mt-1">Your active recurring plans.</p></div>
      {data.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">No active subscriptions.</div>
      ) : (
        <div className="grid gap-3">
          {data.map((s: any) => (
            <div key={s.id} className="rounded-2xl border border-border/70 bg-card p-5 flex justify-between items-center">
              <div>
                <div className="font-semibold">{s.customer_sites?.site_name || "Website"}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.purchase_option === "buy_maintain" ? "Maintenance" : "Subscription"} · started {formatDate(s.created_at)}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatUSD(s.monthly_amount_cents)}/mo</div>
                <div className="text-xs text-muted-foreground capitalize">{s.status}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
