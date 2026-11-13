import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/marketplace/site-header";
import { SiteFooter } from "@/components/marketplace/site-footer";
import { faqLd, seo } from "@/lib/seo";

export const Route = createFileRoute("/faq")({
  component: FAQ,
  head: () =>
    seo({
      title: "FAQ — HooNext",
      description: "Answers to common questions about HooNext.",
      path: "/faq",
      jsonLd: faqLd(items),
    }),
});

const items = [
  {
    q: "What is HooNext?",
    a: "A marketplace where you can purchase professionally designed business websites.",
  },
  {
    q: "What's the difference between the two purchase options?",
    a: "Buy & Maintain is $299 one-time plus $29/mo hosting. Subscription is $99/mo, no upfront.",
  },
  {
    q: "Do I own the website?",
    a: "With Buy & Maintain, yes. With Subscription, access continues while your subscription is active.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes — you can connect a custom domain from your dashboard.",
  },
  { q: "Do you offer refunds?", a: "Contact support within 14 days and we'll help." },
];

function FAQ() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-24 max-w-3xl">
        <h1 className="text-5xl font-bold tracking-tight">Frequently asked questions</h1>
        <div className="mt-10 space-y-3">
          {items.map((it) => (
            <details key={it.q} className="group rounded-xl border border-border/70 bg-card p-5">
              <summary className="cursor-pointer font-medium flex justify-between items-center list-none">
                {it.q}
                <span className="text-muted-foreground group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{it.a}</p>
            </details>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
