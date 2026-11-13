import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Lock,
  Receipt,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/marketplace/site-header";
import { SiteFooter } from "@/components/marketplace/site-footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/shared/page-loader";
import {
  ContactVerification,
  useContactVerified,
} from "@/components/checkout/contact-verification";
import { useAuth } from "@/hooks/use-auth";
import { formatUSD } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ONBOARDING_KEY, readOnboarding } from "@/lib/onboarding";
import { keyMode } from "@/lib/razorpay/config";
import { confirmRazorpayPayment, createRazorpaySubscription } from "@/lib/razorpay/server";
import { noindexHead } from "@/lib/seo";

export const Route = createFileRoute("/checkout/$slug")({
  component: CheckoutPage,
  head: () => noindexHead("Checkout — HooNext"),
});

type PurchaseOption = "buy_maintain" | "subscription";

const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

// Minimal typing for Razorpay Checkout (loaded from CHECKOUT_SCRIPT).
interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open(): void;
  close(): void;
  on(event: "payment.failed", cb: (r: { error?: { description?: string } }) => void): void;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadCheckoutScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SCRIPT}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Razorpay script failed to load")));
    if (!existing) {
      script.src = CHECKOUT_SCRIPT;
      script.async = true;
      document.body.appendChild(script);
    }
  });
}

// After this long without the payment form appearing, offer a retry.
const SLOW_AFTER_MS = 12_000;

// ─── Page ─────────────────────────────────────────────────────────────────────
function CheckoutPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { verified: contactVerified } = useContactVerified();

  const [option, setOption] = useState<PurchaseOption>(() => {
    try {
      const saved = sessionStorage.getItem(`hoonext_plan_${slug}`);
      if (saved === "subscription" || saved === "buy_maintain") return saved;
    } catch {
      /* no sessionStorage (SSR) */
    }
    return "buy_maintain";
  });

  const [sub, setSub] = useState<{ subscriptionId: string; keyId: string } | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [paid, setPaid] = useState<RazorpaySuccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0); // bump to retry
  const [confirming, setConfirming] = useState(false);

  const frameLoaded = Boolean(sub && scriptReady);
  // Test/live comes from the key the server actually uses.
  const isTestMode = sub ? keyMode(sub.keyId) === "test" : false;

  // Timing marks, logged once the form appears, to show where time goes.
  const marks = useRef<Record<string, number>>({ mount: performance.now() });
  const mark = (name: string) => {
    if (marks.current[name] === undefined) marks.current[name] = performance.now();
  };

  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ["template", slug],
    staleTime: 5 * 60_000,
    queryFn: async () =>
      (
        await supabase
          .from("templates")
          .select("*, industries(name,slug)")
          .eq("slug", slug)
          .maybeSingle()
      ).data,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth", search: { redirect: `/checkout/${slug}` } as any });
    }
  }, [authLoading, user, navigate, slug]);

  // 1) Load Razorpay Checkout immediately (in parallel with everything else).
  useEffect(() => {
    let cancelled = false;
    loadCheckoutScript()
      .then(() => {
        if (cancelled) return;
        mark("scriptReady");
        setScriptReady(true);
      })
      .catch((e) => {
        console.error("[razorpay] script load failed", e);
        if (!cancelled) setError("Could not load the payment form. Please refresh and try again.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Create the subscription as soon as we know who is paying. This does
  // NOT wait for the template query: the server looks the template up itself.
  useEffect(() => {
    if (!user || !contactVerified) return;
    let cancelled = false;
    setSub(null);
    setError(null);
    mark("txStart");

    createRazorpaySubscription({
      data: { template_slug: slug, purchase_option: option, business_info: readOnboarding(slug) },
    })
      .then((res) => {
        if (cancelled) return;
        mark("txDone");
        setSub({ subscriptionId: res.subscriptionId, keyId: res.keyId });
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("[checkout] could not create subscription", e);
        setError(e?.message ?? "We couldn't start your payment. Please try again.");
      });

    // Ignore a stale response if the plan was switched mid-flight.
    return () => {
      cancelled = true;
    };
  }, [user?.id, slug, option, contactVerified, attempt]);

  // 3) Open Razorpay Checkout when the customer presses Pay.
  const openCheckout = () => {
    if (!sub || !window.Razorpay) return;
    try {
      const rzp = new window.Razorpay({
        key: sub.keyId,
        subscription_id: sub.subscriptionId,
        name: "HooNext",
        description: `${template?.name ?? "Website"} — ${
          option === "buy_maintain" ? "Buy & Maintain" : "Subscription"
        }`,
        prefill: { email: user?.email ?? "" },
        theme: { color: "#2563eb" },
        handler: (response: RazorpaySuccess) => {
          setPaid(response);
          setConfirming(true);
        },
        modal: { confirm_close: true },
      });
      rzp.on("payment.failed", (r) => {
        console.error("[razorpay] payment failed", r);
        toast.error(r?.error?.description || "The payment didn't go through. Please try again.");
      });
      mark("openCalled");
      rzp.open();
    } catch (e) {
      console.error("[razorpay] open failed", e);
      setError("Could not open the payment form. Please try again.");
    }
  };

  // Offer a retry if the form is slow to appear.
  useEffect(() => {
    setSlow(false);
    if (!contactVerified || frameLoaded || error || confirming) return;
    const t = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [contactVerified, frameLoaded, error, confirming, attempt, option]);

  // One-line timing breakdown in the console once the form is visible.
  useEffect(() => {
    if (!frameLoaded) return;
    mark("txDone");
    const m = marks.current;
    const ms = (a: string, b: string) =>
      m[a] !== undefined && m[b] !== undefined ? Math.round(m[b] - m[a]) : null;
    console.info("[checkout] timings (ms)", {
      "server: create order": ms("txStart", "txDone"),
      "browser: load Razorpay Checkout": ms("mount", "scriptReady"),
      "total until ready to pay": ms("mount", "txDone"),
    });
  }, [frameLoaded]);

  // 4) After payment succeeds, have the server verify the payment with Razorpay
  // and create the order/site right away (the webhook does the same
  // independently; fulfilment is idempotent so both are safe).
  useEffect(() => {
    if (!confirming || !paid || !user) return;
    let cancelled = false;
    let attempts = 0;

    const tick = async () => {
      while (!cancelled && attempts < 15) {
        attempts += 1;
        try {
          const res = await confirmRazorpayPayment({
            data: {
              payment_id: paid.razorpay_payment_id,
              subscription_id: paid.razorpay_subscription_id,
              signature: paid.razorpay_signature,
            },
          });
          if (res.ready && res.siteId) {
            if (cancelled) return;
            try {
              sessionStorage.removeItem(ONBOARDING_KEY(slug));
            } catch {
              /* ignore */
            }
            toast.success("Payment complete! Your website customization has started.");
            navigate({ to: "/dashboard/websites/$id", params: { id: res.siteId } });
            return;
          }
        } catch (e) {
          console.error("[checkout] confirm attempt failed", e);
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (cancelled) return;
      toast.info("Payment received — finishing setup, check your dashboard shortly.");
      navigate({ to: "/dashboard" });
    };
    tick();

    return () => {
      cancelled = true;
    };
  }, [confirming, paid, user, navigate, slug]);

  const retry = () => {
    setError(null);
    setSlow(false);
    if (!scriptReady) {
      loadCheckoutScript()
        .then(() => setScriptReady(true))
        .catch(() => setError("Could not load the payment form. Please refresh and try again."));
    }
    setAttempt((n) => n + 1);
  };

  const templateMissing = !templateLoading && !template;

  const dueToday = template
    ? option === "buy_maintain"
      ? template.one_time_price_cents + template.monthly_maintenance_cents
      : template.subscription_price_cents
    : 0;
  const recurring = template
    ? option === "buy_maintain"
      ? template.monthly_maintenance_cents
      : template.subscription_price_cents
    : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-8 md:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/marketplace/$slug"
              params={{ slug }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to template
            </Link>
            {isTestMode && (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-400">
                Test mode — no real charges
              </span>
            )}
          </div>

          <Stepper />

          <div className="mt-6">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Complete your order</h1>
            <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-primary" />
              Secure, encrypted checkout{user?.email ? ` · signed in as ${user.email}` : ""}
            </p>
          </div>

          {templateMissing ? (
            <div className="mt-10 rounded-2xl border border-border/70 bg-card/60 p-10 text-center">
              <p className="font-medium">We couldn't find that template.</p>
              <Button asChild className="mt-4">
                <Link to="/marketplace">Browse templates</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr,400px]">
              {/* ── Left ── */}
              <div className="space-y-6 min-w-0">
                {/* Plan */}
                <section className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-6">
                  <SectionLabel>1 · Choose your plan</SectionLabel>
                  {template ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <PlanOption
                        selected={option === "buy_maintain"}
                        onClick={() => setOption("buy_maintain")}
                        title="Buy & Maintain"
                        tag="Best value"
                        price={formatUSD(template.one_time_price_cents)}
                        priceSuffix="one-time"
                        sub={`+ ${formatUSD(template.monthly_maintenance_cents)}/mo hosting`}
                        perks={["Own your website", "Hosting & SSL", "Security updates"]}
                      />
                      <PlanOption
                        selected={option === "subscription"}
                        onClick={() => setOption("subscription")}
                        title="Subscription"
                        price={formatUSD(template.subscription_price_cents)}
                        priceSuffix="/ month"
                        sub="No upfront payment"
                        perks={["Everything included", "Hosting & SSL", "Cancel anytime"]}
                      />
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Skeleton className="h-40 rounded-xl" />
                      <Skeleton className="h-40 rounded-xl" />
                    </div>
                  )}
                </section>

                {/* Verification */}
                {!contactVerified && (
                  <section className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-6 space-y-5">
                    <SectionLabel>2 · Verify your contact details</SectionLabel>
                    <ContactVerification defaultPhone={String(readOnboarding(slug)?.phone ?? "")} />
                  </section>
                )}

                Payment
                <section className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-6">
                  <div className="flex items-center justify-between gap-3">
                    <SectionLabel>{contactVerified ? "2" : "3"} · Payment</SectionLabel>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" /> Secured by Razorpay
                    </div>
                  </div>

                  <div className="mt-5">
                    {confirming ? (
                      <ConfirmingPanel />
                    ) : !contactVerified ? (
                      <div className="flex flex-col items-center gap-2 py-10 text-center">
                        <Lock className="h-5 w-5 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Verify your contact details above to unlock payment.
                        </p>
                      </div>
                    ) : error ? (
                      <div
                        role="alert"
                        className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 text-sm"
                      >
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="font-medium">We couldn't load the payment form</div>
                            <p className="mt-1 text-muted-foreground break-words">{error}</p>
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                              <Button size="sm" onClick={retry}>
                                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Try again
                              </Button>
                              <Link
                                to="/support"
                                className="text-xs text-muted-foreground underline hover:text-foreground"
                              >
                                Contact support
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {!frameLoaded && (
                          <PaymentSkeleton
                            stage={!sub ? "order" : "form"}
                            slow={slow}
                            onRetry={retry}
                          />
                        )}
                        {frameLoaded && (
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              Pay securely by credit or debit card. A window from Razorpay opens
                              to take your card details; we never see or store them.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <p className="mt-5 text-[11px] text-center text-muted-foreground">
                    By paying you agree to our{" "}
                    <Link to="/terms" className="underline hover:text-foreground">
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="underline hover:text-foreground">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </section>
              </div>

              {/* ── Right: order summary (first on mobile) ── */}
              <aside className="order-first lg:order-none lg:sticky lg:top-24 self-start">
                <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm overflow-hidden">
                  {template ? (
                    <>
                      <div className="flex gap-3 p-4 border-b border-border/60">
                        <div className="h-16 w-24 rounded-lg overflow-hidden bg-muted shrink-0">
                          {template.thumbnail_url && (
                            <img
                              src={template.thumbnail_url}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{template.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {(template as any).industries?.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-1">
                            {option === "buy_maintain"
                              ? "Buy & Maintain plan"
                              : "Subscription plan"}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 space-y-2 text-sm">
                        {option === "buy_maintain" && (
                          <SummaryRow
                            label="Website template (one-time)"
                            value={formatUSD(template.one_time_price_cents)}
                          />
                        )}
                        <SummaryRow
                          label={
                            option === "buy_maintain"
                              ? "Hosting & maintenance (first month)"
                              : "Subscription (first month)"
                          }
                          value={formatUSD(recurring)}
                        />
                        <div className="border-t border-border/60 pt-3 mt-2 flex justify-between items-baseline">
                          <div className="text-sm font-semibold">Due today</div>
                          <div className="text-2xl font-bold text-gradient">
                            {formatUSD(dueToday)}
                          </div>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Then {formatUSD(recurring)}/month{" "}
                          {option === "buy_maintain"
                            ? "for hosting & maintenance"
                            : "while subscribed"}
                          . Cancel anytime.
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-8 w-1/2" />
                    </div>
                  )}

                  <div className="p-4 border-t border-border/60 bg-background/40 space-y-2.5">
                    <TrustRow icon={Lock}>Payments are encrypted end-to-end</TrustRow>
                    <TrustRow icon={Receipt}>
                      Payments are processed by Razorpay; a confirmation is emailed to you
                    </TrustRow>
                    <TrustRow icon={CheckCircle2}>
                      International credit and debit cards, charged in USD
                    </TrustRow>
                    <div className="pt-1 text-[11px] text-muted-foreground">
                      Questions?{" "}
                      <Link to="/refund-policy" className="underline hover:text-foreground">
                        Refund policy
                      </Link>{" "}
                      ·{" "}
                      <Link to="/support" className="underline hover:text-foreground">
                        Support
                      </Link>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {/* ── Pay button: bottom of the page ── */}
          {!templateMissing && contactVerified && !confirming && !error && frameLoaded && (
            <div className="mt-8 space-y-3">
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={openCheckout}
                disabled={!template}
              >
                <Lock className="h-4 w-4 mr-2" /> Pay {formatUSD(dueToday)}
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                By paying you authorise {formatUSD(recurring)} to be charged every month until
                you cancel.
              </p>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────────
function Stepper() {
  const steps = [
    { label: "Customize", done: true },
    { label: "Review", done: true },
    { label: "Payment", done: false },
  ];
  return (
    <ol className="mt-6 flex items-center gap-2 text-xs" aria-label="Order progress">
      {steps.map((s, i) => (
        <li key={s.label} className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold",
              s.done
                ? "border-primary bg-primary text-primary-foreground"
                : "border-primary text-primary",
            )}
          >
            {s.done ? <Check className="h-3 w-3" /> : i + 1}
          </span>
          <span className={cn(s.done ? "text-muted-foreground" : "font-medium text-foreground")}>
            {s.label}
          </span>
          {i < steps.length - 1 && <span className="mx-1 h-px w-8 bg-border" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-widest text-primary font-medium">{children}</div>
  );
}

function PaymentSkeleton({
  stage,
  slow,
  onRetry,
}: {
  stage: "order" | "form";
  slow: boolean;
  onRetry: () => void;
}) {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <div className="space-y-3" aria-hidden="true">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className="h-3.5 w-3.5 rounded-full border-2 border-primary/70 border-t-transparent animate-spin" />
        {stage === "order" ? "Preparing your secure order…" : "Loading the secure payment form…"}
      </div>
      {slow && (
        <div className="rounded-lg border border-border/70 bg-background/50 p-3 text-center text-xs text-muted-foreground">
          This is taking longer than usual.{" "}
          <button type="button" onClick={onRetry} className="text-primary underline">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function ConfirmingPanel() {
  return (
    <div
      className="flex flex-col items-center gap-4 py-10 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
        <CheckCircle2 className="h-6 w-6 text-emerald-400" />
      </div>
      <div>
        <div className="font-semibold">Payment received — thank you!</div>
        <p className="mt-1 text-sm text-muted-foreground">
          We're setting up your order and website workspace. This only takes a moment.
        </p>
      </div>
      <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
        <div className="skeleton h-full w-full" />
      </div>
    </div>
  );
}

function TrustRow({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function SummaryRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className={cn("text-muted-foreground", muted && "opacity-70")}>{label}</span>
      <span className={cn("font-medium shrink-0", muted && "text-muted-foreground")}>{value}</span>
    </div>
  );
}

function PlanOption({
  selected,
  onClick,
  title,
  tag,
  price,
  priceSuffix,
  sub,
  perks,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  tag?: string;
  price: string;
  priceSuffix: string;
  sub: string;
  perks: string[];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "relative text-left rounded-xl border p-4 transition-all",
        selected
          ? "border-primary/60 bg-primary/5 shadow-[0_0_0_1px_color-mix(in_oklab,var(--brand-blue)_40%,transparent)]"
          : "border-border/70 bg-background/40 hover:border-primary/30",
      )}
    >
      {tag && (
        <span className="absolute -top-2 right-3 text-[10px] uppercase tracking-widest bg-primary text-primary-foreground rounded-full px-2 py-0.5">
          {tag}
        </span>
      )}
      <div className="flex items-center justify-between">
        <div className="font-semibold">{title}</div>
        <div
          className={cn(
            "h-4 w-4 rounded-full border-2 flex items-center justify-center",
            selected ? "border-primary bg-primary" : "border-border",
          )}
        >
          {selected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
        </div>
      </div>
      <div className="mt-2">
        <span className="text-2xl font-bold">{price}</span>{" "}
        <span className="text-xs text-muted-foreground">{priceSuffix}</span>
      </div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
      <ul className="mt-3 space-y-1">
        {perks.map((p) => (
          <li key={p} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Check className="h-3 w-3 text-primary" /> {p}
          </li>
        ))}
      </ul>
    </button>
  );
}