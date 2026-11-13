import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatDate, formatUSD } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/orders")({ component: Orders });

function Orders() {
  const { user } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("orders")
      .select("*, templates(name)").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold tracking-tight">Orders</h2>
      <p className="text-sm text-muted-foreground mt-1">Every purchase you've made on HooNext.</p>
      <div className="mt-6 rounded-2xl border border-border/70 bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Template</th><th className="text-left px-4 py-3">Option</th><th className="text-right px-4 py-3">Amount</th><th className="text-right px-4 py-3">Status</th></tr>
          </thead>
          <tbody>
            {data.map((o: any) => (
              <tr key={o.id} className="border-t">
                <td className="px-4 py-3">{formatDate(o.created_at)}</td>
                <td className="px-4 py-3">{o.templates?.name}</td>
                <td className="px-4 py-3">{o.purchase_option === "buy_maintain" ? "Buy & Maintain" : "Subscription"}</td>
                <td className="px-4 py-3 text-right">{formatUSD(o.amount_cents)}</td>
                <td className="px-4 py-3 text-right capitalize">{o.status}</td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
