import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate, formatUSD } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { notifyUser } from "@/lib/notify";
import { AlertTriangle, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({ component: AdminSubs });

const PLANS = [
  { value: "subscription_basic", label: "Subscription Basic", cents: 4900 },
  { value: "subscription_pro", label: "Subscription Pro", cents: 9900 },
  { value: "buy_maintain", label: "Buy & Maintain", cents: 2900 },
];

function AdminSubs() {
  const qc = useQueryClient();
  const [planDialog, setPlanDialog] = useState<{ sub: any } | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPlan, setSelectedPlan] = useState("");

  const { data: subs = [] } = useQuery({
    queryKey: ["admin-subs"],
    queryFn: async () =>
      (await supabase.from("subscriptions")
        .select("*, customer_sites(site_name, user_id), profiles(full_name, email)")
        .order("created_at", { ascending: false })).data ?? [],
  });

  const changePlan = useMutation({
    mutationFn: async ({ subId, plan, userId }: { subId: string; plan: typeof PLANS[0]; userId: string }) => {
      const { error } = await supabase.from("subscriptions")
        .update({ purchase_option: plan.value as "buy_maintain" | "subscription", monthly_amount_cents: plan.cents })
        .eq("id", subId);
      if (error) throw error;
      await notifyUser(userId, {
        title: "Subscription plan changed",
        body: `Your plan has been updated to ${plan.label} (${formatUSD(plan.cents)}/mo).`,
        url: "/dashboard/subscription",
        type: "subscription",
      });
    },
    onSuccess: () => {
      toast.success("Plan updated & customer notified");
      qc.invalidateQueries({ queryKey: ["admin-subs"] });
      setPlanDialog(null);
      setStep(1);
      setSelectedPlan("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openPlanChange = (sub: any) => {
    setSelectedPlan(sub.purchase_option || "");
    setStep(1);
    setPlanDialog({ sub });
  };

  const confirmPlan = () => {
    if (step === 1) { setStep(2); return; }
    const plan = PLANS.find((p) => p.value === selectedPlan);
    if (!plan || !planDialog) return;
    changePlan.mutate({
      subId: planDialog.sub.id,
      plan,
      userId: planDialog.sub.customer_sites?.user_id,
    });
  };

  const STATUS_COLORS: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-400",
    cancelled: "bg-red-500/15 text-red-400",
    paused: "bg-amber-500/15 text-amber-400",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Subscriptions</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage customer recurring plans.</p>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Customer</th>
              <th className="text-left px-4 py-3">Website</th>
              <th className="text-left px-4 py-3">Plan</th>
              <th className="text-right px-4 py-3">$/mo</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Started</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s: any) => (
              <tr key={s.id} className="border-t hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium">{s.profiles?.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{s.profiles?.email}</div>
                </td>
                <td className="px-4 py-3">{s.customer_sites?.site_name || "—"}</td>
                <td className="px-4 py-3 capitalize">{(s.purchase_option || "—").replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-right font-medium">{formatUSD(s.monthly_amount_cents)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={cn("text-[10px] uppercase tracking-widest rounded-full px-2 py-0.5", STATUS_COLORS[s.status] || "bg-muted text-muted-foreground")}>
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(s.created_at)}</td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="outline" className="rounded-full text-xs h-7" onClick={() => openPlanChange(s)}>
                    Change plan
                  </Button>
                </td>
              </tr>
            ))}
            {subs.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No subscriptions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 2-step plan change dialog */}
      <Dialog open={!!planDialog} onOpenChange={(o) => { if (!o) { setPlanDialog(null); setStep(1); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {step === 1 ? "Change subscription plan" : "Confirm plan change"}
            </DialogTitle>
          </DialogHeader>

          {step === 1 ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm">
                <div className="font-medium">{planDialog?.sub?.profiles?.full_name || "Customer"}</div>
                <div className="text-muted-foreground text-xs mt-0.5">{planDialog?.sub?.customer_sites?.site_name}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Current plan: <span className="text-foreground capitalize">{(planDialog?.sub?.purchase_option || "—").replace(/_/g, " ")}</span>
                  {" · "}{formatUSD(planDialog?.sub?.monthly_amount_cents)}/mo
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">New plan</label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Select a plan…" /></SelectTrigger>
                  <SelectContent>
                    {PLANS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label} — {formatUSD(p.cents)}/mo
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-semibold text-amber-300">Please confirm this change</div>
                  <div className="text-amber-200/80 mt-1">
                    You are changing <strong>{planDialog?.sub?.profiles?.full_name || "this customer"}</strong>'s plan to{" "}
                    <strong>{PLANS.find((p) => p.value === selectedPlan)?.label}</strong> at{" "}
                    <strong>{formatUSD(PLANS.find((p) => p.value === selectedPlan)?.cents ?? 0)}/mo</strong>.
                    <br /><br />
                    The customer will be notified via in-app notification and email.
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { step === 2 ? setStep(1) : setPlanDialog(null); }}>
              {step === 2 ? "Back" : "Cancel"}
            </Button>
            <Button
              onClick={confirmPlan}
              disabled={!selectedPlan || changePlan.isPending}
              className={cn("btn-gradient border-0", step === 2 && "bg-amber-500 hover:bg-amber-600")}
            >
              {step === 1 ? (
                <><Check className="h-4 w-4 mr-1" /> Continue</>
              ) : changePlan.isPending ? "Updating…" : (
                <><Check className="h-4 w-4 mr-1" /> Confirm change</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
