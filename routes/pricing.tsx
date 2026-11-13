import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/marketplace/site-header";
import { SiteFooter } from "@/components/marketplace/site-footer";
import { CheckCircle2, TrendingUp } from "lucide-react";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () =>
    seo({
      title: "Pricing — HooNext | Websites for Local Service Businesses",
      description:
        "Simple, honest pricing for done-for-you websites. Pay $299 once plus $29/month, or $99/month with no upfront cost. Free live preview before you pay.",
      path: "/pricing",
    }),
});

const plans = [
  {
    name: "Subscription",
    price: "$99",
    period: "/month",
    tag: null,
    desc: "No upfront cost. Pay monthly and cancel anytime.",
    helper: "Best if you'd rather not pay anything upfront.",
    perks: [
      "Professional website",
      "Custom domain",
      "Hosting & SSL",
      "Monthly updates included",
      "Support ticket system",
      "Cancel anytime",
    ],
    cta: "Start subscription",
    highlight: false,
  },
  {
    name: "Buy & Maintain",
    price: "$299",
    period: "one-time",
    tag: "Most popular",
    desc: "Own your website outright, then $29/month for hosting and upkeep.",
    helper:
      "Best for the lowest cost over time — $70/mo less than the subscription after your first payment.",
    perks: [
      "Everything in Subscription",
      "You own the site",
      "$29/mo maintenance",
      "Priority support",
      "Free domain for 1 year",
      "2 free revision rounds",
    ],
    cta: "Buy your site",
    highlight: true,
  },
];

const faqs = [
  {
    q: "Is there really no upfront cost with the Subscription plan?",
    a: "Correct — you preview your site for free, and if you go with Subscription, the first charge is your first month, not a setup fee.",
  },
  {
    q: "What happens if I cancel?",
    a: "Subscription can be canceled anytime from your dashboard — your site stays live through the end of the billing period. Buy & Maintain customers own their site outright; canceling maintenance stops hosting and support, but you keep your purchase.",
  },
  {
    q: "Are there any hidden fees?",
    a: "No. Domain registration (after your first free year on Buy & Maintain) and optional custom feature requests are the only costs outside the listed plans, and we always quote those before doing any work.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes — reach out through Support and we'll help you move between Subscription and Buy & Maintain.",
  },
];

function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="container-page py-16 md:py-24 text-center max-w-3xl mx-auto">
          <div className="text-xs uppercase tracking-widest text-primary font-medium">Pricing</div>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight">
            Simple, honest pricing.
          </h1>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            No hidden fees, no surprise costs. Preview your website for free, then pick the plan
            that fits your business.
          </p>
        </section>

        <section className="container-page pb-20">
          <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-2xl border p-8 flex flex-col ${p.highlight ? "border-primary/50 bg-primary/[0.04]" : "border-border/70 bg-card/60"}`}
              >
                {p.tag && (
                  <div className="absolute -top-3 left-8 rounded-md bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                    {p.tag}
                  </div>
                )}
                <div className="text-sm font-medium text-muted-foreground">{p.name}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-5xl font-black">{p.price}</span>
                  <span className="text-muted-foreground text-sm">{p.period}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{p.desc}</p>
                <div className="mt-3 flex items-start gap-1.5 text-xs text-primary">
                  <TrendingUp className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{p.helper}</span>
                </div>
                <ul className="mt-6 space-y-3 flex-1">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {perk}
                    </li>
                  ))}
                </ul>
                <Link to="/marketplace" className="mt-8 block">
                  <button
                    className={`w-full rounded-md py-3 text-sm font-bold transition-all ${p.highlight ? "bg-primary text-primary-foreground hover:opacity-90" : "border border-border bg-card hover:border-primary/40"}`}
                  >
                    {p.cta}
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="container-page pb-24 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight">Pricing questions</h2>
          <div className="mt-6 space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-xl border border-border/60 bg-card/40 p-5">
                <div className="font-semibold text-sm">{f.q}</div>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
