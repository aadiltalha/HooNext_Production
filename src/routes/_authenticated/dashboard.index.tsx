import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Globe, Receipt, Repeat, Wrench, MessageSquare, Sparkles } from "lucide-react";
import { formatDate } from "@/lib/format";

const FREE_QUOTA_PER_YEAR = 5;

export const Route = createFileRoute("/_authenticated/dashboard/")({ component: Overview });

function Overview() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["overview", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
      const [{ count: sites }, { count: orders }, { count: subs }, { data: reqs }, { data: msgs }] = await Promise.all([
        supabase.from("customer_sites").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("status", "active"),
        supabase.from("site_update_requests").select("*, customer_sites(site_name)").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("support_messages").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(5),
      ]);
      const usedFree = (reqs ?? []).filter((r: any) => !r.billable && new Date(r.created_at) >= new Date(yearStart)).length;
      return { sites: sites ?? 0, orders: orders ?? 0, subs: subs ?? 0, reqs: reqs ?? [], msgs: msgs ?? [], usedFree };
    },
  });

  const remaining = Math.max(0, FREE_QUOTA_PER_YEAR - (stats?.usedFree ?? 0));

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
        <p className="text-muted-foreground text-sm mt-1">Here's what's happening across your websites.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Globe} label="Websites" value={stats?.sites ?? 0} />
        <Stat icon={Receipt} label="Orders" value={stats?.orders ?? 0} />
        <Stat icon={Repeat} label="Active plans" value={stats?.subs ?? 0} />
        <Stat icon={Sparkles} label="Free updates left" value={remaining} accent />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelList
          icon={Wrench}
          title="Recent update requests"
          empty="No update requests yet."
          items={(stats?.reqs ?? []).map((r: any) => ({
            key: r.id, title: r.title, meta: `${r.customer_sites?.site_name || "—"} · ${r.status.replace("_", " ")}`, when: formatDate(r.created_at),
          }))}
          cta={{ to: "/dashboard/updates", label: "Manage requests →" }}
        />
        <PanelList
          icon={MessageSquare}
          title="Recent messages"
          empty="No messages yet."
          items={(stats?.msgs ?? []).map((m: any) => ({
            key: m.id, title: m.subject, meta: `${m.from_admin ? "Support" : "You"}: ${m.body.slice(0, 60)}`, when: formatDate(m.created_at),
          }))}
          cta={{ to: "/dashboard/support", label: "Open messages →" }}
        />
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-8">
        <h3 className="text-lg font-semibold">Ready for another one?</h3>
        <p className="text-sm text-muted-foreground mt-1">Browse the marketplace and add another website.</p>
        <Button asChild className="mt-4 btn-gradient border-0"><Link to="/marketplace">Browse marketplace</Link></Button>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: any) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6">
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${accent ? "bg-primary/15 text-primary" : "bg-accent/10 text-accent"}`}><Icon className="h-4 w-4" /></div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
      <div className={`mt-4 text-3xl font-bold ${accent ? "text-gradient" : ""}`}>{value}</div>
    </div>
  );
}

function PanelList({ icon: Icon, title, empty, items, cta }: any) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card overflow-hidden flex flex-col">
      <div className="px-5 py-4 flex items-center gap-3 border-b border-border/60">
        <Icon className="h-4 w-4 text-primary" />
        <div className="font-semibold text-sm">{title}</div>
      </div>
      {items.length === 0 ? (
        <div className="p-8 text-sm text-muted-foreground text-center">{empty}</div>
      ) : (
        <div className="divide-y divide-border/60">
          {items.map((it: any) => (
            <div key={it.key} className="px-5 py-3">
              <div className="text-sm font-medium truncate">{it.title}</div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">{it.meta}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{it.when}</div>
            </div>
          ))}
        </div>
      )}
      <Link to={cta.to} className="px-5 py-3 text-sm text-primary hover:bg-accent/40 border-t border-border/60 mt-auto">{cta.label}</Link>
    </div>
  );
}
