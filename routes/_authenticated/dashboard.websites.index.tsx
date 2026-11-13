import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/websites/")({
  component: MyWebsites,
});

const OPTION_LABEL: Record<string, string> = {
  buy_maintain: "Buy & Maintain",
  subscription: "Subscription",
};

function MyWebsites() {
  const { user } = useAuth();
  const { data: sites = [] } = useQuery({
    queryKey: ["sites", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (
        await supabase
          .from("customer_sites")
          .select(
            "id, site_name, purchase_option, status, created_at, templates(name, industries(name))",
          )
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Websites</h2>
          <p className="text-sm text-muted-foreground mt-1">
            All websites you've purchased or subscribed to.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/marketplace">+ Add website</Link>
        </Button>
      </div>
      {sites.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <p className="text-muted-foreground">You don't have any websites yet.</p>
          <Button asChild className="mt-4">
            <Link to="/marketplace">Browse marketplace</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((s: any) => (
            <div key={s.id} className="rounded-2xl border border-border/70 bg-card p-5 space-y-3">
              <div>
                <div className="font-semibold">{s.site_name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {s.templates?.industries?.name}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Info label="Option" value={OPTION_LABEL[s.purchase_option]} />
                <Info
                  label="Status"
                  value={<span className="capitalize">{s.status.replace("_", " ")}</span>}
                />
                <Info label="Purchased" value={formatDate(s.created_at)} />
                <Info label="Template" value={s.templates?.name} />
              </div>
              <Button asChild size="sm" className="w-full">
                <Link to="/dashboard/websites/$id" params={{ id: s.id }}>
                  Manage website
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}
