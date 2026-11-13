import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatUSD, formatDate } from "@/lib/format";
import { LayoutTemplate, Users, Receipt, Repeat, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/")({ component: AdminOverview });

function AdminOverview() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [t, o, s, sub, recentOrders] = await Promise.all([
        supabase.from("templates").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("amount_cents"),
        supabase.from("customer_sites").select("*", { count: "exact", head: true }),
        supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("orders").select("*, profiles(full_name, email), templates(name)").order("created_at", { ascending: false }).limit(5),
      ]);
      const revenue = (o.data ?? []).reduce((sum, r: any) => sum + r.amount_cents, 0);
      return {
        templates: t.count ?? 0,
        sites: s.count ?? 0,
        subs: sub.count ?? 0,
        revenue,
        recentOrders: recentOrders.data ?? [],
      };
    },
    refetchInterval: 60_000,
  });

  const { data: allSites = [] } = useQuery({
    queryKey: ["admin-sites-pipeline"],
    queryFn: async () => (await supabase.from("customer_sites").select("status")).data ?? [],
  });

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["admin-pending-requests"],
    queryFn: async () =>
      (await supabase.from("site_update_requests")
        .select("id, title, created_at, profiles(full_name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5)).data ?? [],
  });

  const pending = allSites.filter((s: any) => s.status === "pending_info").length;
  const inProgress = allSites.filter((s: any) => ["in_setup", "in_development"].includes(s.status)).length;
  const completed = allSites.filter((s: any) => s.status === "live").length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Admin Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">Live metrics and pending actions.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={LayoutTemplate} label="Templates" value={stats?.templates ?? 0} />
        <StatCard icon={Users} label="Customer sites" value={stats?.sites ?? 0} />
        <StatCard icon={Receipt} label="Total orders" value={(stats?.recentOrders ?? []).length} />
        <StatCard icon={Repeat} label="Active subs" value={stats?.subs ?? 0} />
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-6 flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Total revenue</div>
          <div className="text-4xl font-bold mt-1 text-gradient">{formatUSD(stats?.revenue ?? 0)}</div>
        </div>
        <Link to="/admin/orders" className="text-xs text-primary hover:underline">View all orders →</Link>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Order Pipeline</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <PipelineCard icon={Clock} label="Pending / Awaiting Info" value={pending} color="text-amber-400" bg="bg-amber-500/10 border-amber-500/30" href="/admin/orders" />
          <PipelineCard icon={Loader2} label="In Progress" value={inProgress} color="text-blue-400" bg="bg-blue-500/10 border-blue-500/30" href="/admin/orders" />
          <PipelineCard icon={CheckCircle2} label="Completed / Live" value={completed} color="text-emerald-400" bg="bg-emerald-500/10 border-emerald-500/30" href="/admin/orders" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
            <h3 className="font-semibold">Recent Orders</h3>
            <Link to="/admin/orders" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-border/60">
            {(stats?.recentOrders ?? []).length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">No orders yet.</div>
            )}
            {(stats?.recentOrders ?? []).map((o: any) => (
              <div key={o.id} className="flex items-center gap-3 px-5 py-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Receipt className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{o.profiles?.full_name || o.profiles?.email || "Customer"}</div>
                  <div className="text-xs text-muted-foreground truncate">{o.templates?.name} · {formatDate(o.created_at)}</div>
                </div>
                <div className="text-sm font-semibold shrink-0">{formatUSD(o.amount_cents)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
            <h3 className="font-semibold">Pending Update Requests</h3>
            <Link to="/admin/requests" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-border/60">
            {pendingRequests.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">No pending requests.</div>
            )}
            {pendingRequests.map((r: any) => (
              <div key={r.id} className="flex items-start gap-3 px-5 py-3">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.profiles?.full_name || "Customer"} · {formatDate(r.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4" />{label}</div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
    </div>
  );
}

function PipelineCard({ icon: Icon, label, value, color, bg, href }: any) {
  return (
    <Link to={href} className={cn("rounded-xl border p-5 flex items-center gap-4 transition-all hover:opacity-90", bg)}>
      <Icon className={cn("h-6 w-6 shrink-0", color)} />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn("text-3xl font-bold mt-0.5", color)}>{value}</div>
      </div>
    </Link>
  );
}
