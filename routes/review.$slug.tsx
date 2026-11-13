import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/marketplace/site-header";
import { SiteFooter } from "@/components/marketplace/site-footer";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/shared/page-loader";
import { formatUSD } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Clock, ShieldCheck, Sparkles, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { ONBOARDING_KEY, type OnboardingData } from "@/lib/onboarding";
import { warmCheckout } from "@/lib/razorpay/server";
import { noindexHead } from "@/lib/seo";

export const Route = createFileRoute("/review/$slug")({
  component: ReviewPage,
  head: () => noindexHead("Review your order — HooNext"),
});

type PurchaseOption = "buy_maintain" | "subscription";

function ReviewPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Quietly prepare the payment server before they click "Continue to payment".
  useEffect(() => {
    if (user) void warmCheckout().catch(() => undefined);
  }, [user?.id]);
  const [option, setOption] = useState<PurchaseOption>("buy_maintain");
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);

  useEffect(() => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/review/${slug}` } as any });
      return;
    }
    try {
      const raw = sessionStorage.getItem(ONBOARDING_KEY(slug));
      if (!raw) {
        navigate({ to: "/customize/$slug", params: { slug } });
        return;
      }
      setOnboarding(JSON.parse(raw));
    } catch {
      navigate({ to: "/customize/$slug", params: { slug } });
    }
  }, [slug, user, navigate]);

  const { data: template, isLoading } = useQuery({
    queryKey: ["template", slug],
    queryFn: async () =>
      (
        await supabase
          .from("templates")
          .select("*, industries(name)")
          .eq("slug", slug)
          .maybeSingle()
      ).data,
  });

  if (isLoading || !template || !onboarding) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <PageLoader message="Loading order review" />
        </main>
      </div>
    );
  }

  const dueToday =
    option === "buy_maintain"
      ? template.one_time_price_cents + template.monthly_maintenance_cents
      : template.subscription_price_cents;

  const confirmAndPay = () => {
    // Persist chosen plan so checkout picks it up
    try {
      sessionStorage.setItem(`hoonext_plan_${slug}`, option);
    } catch {}
    navigate({ to: "/checkout/$slug", params: { slug } });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-10 md:py-14">
        <div className="max-w-5xl mx-auto">
          <Link
            to="/customize/$slug"
            params={{ slug }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to customize
          </Link>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Step 2 of 3 — review your order
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">Review your order</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Confirm everything looks right, then continue to payment.
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr,380px]">
            <div className="space-y-6">
              {/* Template */}
              <Section title="Selected template">
                <div className="flex items-start gap-4">
                  <div className="h-20 w-28 rounded-lg overflow-hidden bg-muted shrink-0">
                    {template.thumbnail_url && (
                      <img
                        src={template.thumbnail_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{template.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {(template as any).industries?.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {template.description}
                    </div>
                  </div>
                </div>
              </Section>

              {/* Plan */}
              <Section title="Choose your plan">
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["buy_maintain", "subscription"] as PurchaseOption[]).map((opt) => {
                    const selected = option === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setOption(opt)}
                        className={cn(
                          "text-left rounded-xl border p-4 transition-all",
                          selected
                            ? "border-primary/60 bg-primary/5"
                            : "border-border/70 hover:border-primary/30",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">
                            {opt === "buy_maintain" ? "Buy & Maintain" : "Subscription"}
                          </div>
                          <div
                            className={cn(
                              "h-4 w-4 rounded-full border-2",
                              selected ? "border-primary bg-primary" : "border-border",
                            )}
                          />
                        </div>
                        <div className="mt-2 text-2xl font-bold">
                          {opt === "buy_maintain"
                            ? formatUSD(template.one_time_price_cents)
                            : formatUSD(template.subscription_price_cents)}
                          <span className="text-xs text-muted-foreground ml-1 font-normal">
                            {opt === "buy_maintain" ? "one-time" : "/month"}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {opt === "buy_maintain"
                            ? `+ ${formatUSD(template.monthly_maintenance_cents)}/mo hosting`
                            : "Everything included"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Section>

              {/* Business info summary */}
              <Section
                title="Business information"
                action={
                  <Link
                    to="/customize/$slug"
                    params={{ slug }}
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </Link>
                }
              >
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <Info label="Business" value={onboarding.business_name} />
                  <Info label="Contact" value={onboarding.contact_person} />
                  <Info label="Email" value={onboarding.email} />
                  <Info label="Phone" value={onboarding.phone} />
                  <Info label="Address" value={onboarding.address} full />
                  <Info label="Services" value={onboarding.services} full multiline />
                  <Info label="Brand colors" value={onboarding.brand_colors} />
                  <Info label="Existing domain" value={onboarding.existing_domain} />
                  {onboarding.logo_data_url && (
                    <div className="sm:col-span-2">
                      <div className="text-xs text-muted-foreground">Logo</div>
                      <img
                        src={onboarding.logo_data_url}
                        alt="Logo"
                        className="mt-1.5 h-14 w-14 rounded-lg object-contain bg-white border border-border/60"
                      />
                    </div>
                  )}
                </div>
              </Section>

              {/* Requested changes */}
              {onboarding.change_requests?.trim() && (
                <Section title="Requested customizations">
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm whitespace-pre-wrap">
                    {onboarding.change_requests}
                  </div>
                </Section>
              )}
            </div>

            {/* Sidebar summary */}
            <aside className="lg:sticky lg:top-24 self-start space-y-4">
              <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm overflow-hidden">
                <div className="p-4 border-b border-border/60">
                  <div className="text-xs uppercase tracking-widest text-primary font-medium">
                    Order summary
                  </div>
                </div>
                <div className="p-4 space-y-2 text-sm">
                  <Row
                    label={option === "buy_maintain" ? "Template (one-time)" : "Subscription"}
                    value={
                      option === "buy_maintain"
                        ? formatUSD(template.one_time_price_cents)
                        : formatUSD(template.subscription_price_cents)
                    }
                  />
                  {option === "buy_maintain" && (
                    <Row
                      label="Hosting (first month)"
                      value={formatUSD(template.monthly_maintenance_cents)}
                    />
                  )}
                  <Row label="Tax" value="$0" muted />
                  <div className="border-t border-border/60 pt-3 mt-2 flex justify-between items-baseline">
                    <div className="font-semibold">Due today</div>
                    <div className="text-2xl font-bold text-gradient">{formatUSD(dueToday)}</div>
                  </div>
                </div>
                <div className="p-4 border-t border-border/60 bg-background/40 space-y-2">
                  <Perk icon={Clock} text="Delivery in 3–5 business days" />
                  <Perk icon={CheckCircle2} text="2 free revision rounds" />
                  <Perk icon={ShieldCheck} text="Hosting & SSL included" />
                </div>
              </div>
              <Button
                onClick={confirmAndPay}
                size="lg"
                className="w-full rounded-full h-12 btn-gradient border-0"
              >
                Confirm & pay <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/customize/$slug" params={{ slug }}>
                  Edit information
                </Link>
              </Button>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs uppercase tracking-widest text-primary font-medium">{title}</div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Info({
  label,
  value,
  full,
  multiline,
}: {
  label: string;
  value?: string;
  full?: boolean;
  multiline?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={cn(full && "sm:col-span-2")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn("mt-0.5", multiline ? "whitespace-pre-wrap text-sm" : "font-medium text-sm")}
      >
        {value}
      </div>
    </div>
  );
}
function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={cn("text-muted-foreground", muted && "opacity-70")}>{label}</span>
      <span className={cn("font-medium", muted && "text-muted-foreground")}>{value}</span>
    </div>
  );
}
function Perk({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-primary" /> {text}
    </div>
  );
}