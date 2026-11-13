import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { NotFoundPage } from "@/components/shared/not-found-page";
import { fetchTemplate } from "@/lib/public-data";
import { breadcrumbLd, noindexHead, productLd, seo } from "@/lib/seo";
import { SiteHeader } from "@/components/marketplace/site-header";
import { SiteFooter } from "@/components/marketplace/site-footer";
import { Button } from "@/components/ui/button";
import { formatUSD } from "@/lib/format";
import {
  Check,
  Monitor,
  Smartphone,
  Tablet,
  ExternalLink,
  ShieldCheck,
  Rocket,
  Zap,
  Headphones,
  Wrench,
  LayoutDashboard,
  Search,
  Star,
  TrendingUp,
  Users,
  Award,
  MapPin,
  BarChart3,
  MessageSquare,
  CreditCard,
  Globe,
  Clock,
  RefreshCw,
  Layers,
  Gift,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const DEFAULT_PREVIEW =
  "https://preview.themeforest.net/item/techmarket-multidemo-electronics-store-woocommerce-theme/full_screen_preview/20241155";

export const Route = createFileRoute("/marketplace/$slug")({
  // Runs on the server for the first view, so crawlers receive the real page
  // (and a real 404 status for unknown templates), not a loading spinner.
  loader: async ({ params }) => {
    const template = await fetchTemplate(params.slug);
    if (!template) throw notFound();
    return { template };
  },
  head: ({ loaderData }) => {
    const t = loaderData?.template as any;
    if (!t) return noindexHead("Template not found — HooNext");
    const industry = t.industries?.name as string | undefined;
    return seo({
      title: `${t.name}${industry ? ` — ${industry}` : ""} Website Template | HooNext`,
      description:
        t.description ||
        `${t.name}: a professionally designed${industry ? ` ${industry.toLowerCase()}` : ""} website template. We customize, launch and maintain it for you.`,
      path: `/marketplace/${t.slug}`,
      image: t.thumbnail_url,
      noindex: t.enabled === false,
      jsonLd: [
        productLd(t),
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Templates", path: "/marketplace" },
          { name: t.name, path: `/marketplace/${t.slug}` },
        ]),
      ],
    });
  },
  notFoundComponent: () => <NotFoundPage />,
  component: TemplateDetails,
});

type Device = "desktop" | "tablet" | "mobile";

/* ---------- helpers to keep admin-provided data tidy ---------- */

type Feature = { title: string; description?: string };

// Admin may save features as string[], {title|name|label, description|text}[], or a newline string.
function normalizeFeatures(raw: unknown): Feature[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === "string") list = raw.split(/\r?\n/);
  return list
    .map((f): Feature | null => {
      if (typeof f === "string") {
        const s = f.replace(/^[-•*]\s*/, "").trim();
        return s ? { title: s } : null;
      }
      if (f && typeof f === "object") {
        const o = f as Record<string, any>;
        const title = String(o.title ?? o.name ?? o.label ?? "").trim();
        const description = String(o.description ?? o.text ?? "").trim();
        return title ? { title, description: description || undefined } : null;
      }
      return null;
    })
    .filter(Boolean) as Feature[];
}

// Split description into paragraphs and bullet groups.
type DescBlock = { type: "p"; text: string } | { type: "ul"; items: string[] };
function parseDescription(raw?: string | null): DescBlock[] {
  if (!raw) return [];
  const blocks: DescBlock[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) blocks.push({ type: "ul", items: bullets });
    bullets = [];
  };
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) {
      flush();
      continue;
    }
    if (/^[-•*]\s+/.test(t)) bullets.push(t.replace(/^[-•*]\s+/, ""));
    else {
      flush();
      blocks.push({ type: "p", text: t });
    }
  }
  flush();
  return blocks;
}

function TemplateDetails() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Preview device: auto-picked from screen size, unless the visitor picks one manually.
  const [device, setDevice] = useState<Device>("desktop");
  const [deviceLocked, setDeviceLocked] = useState(false);

  useEffect(() => {
    if (deviceLocked) return;
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setDevice(mq.matches ? "mobile" : "desktop");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [deviceLocked]);

  // Seeded with the server-loaded template, so there is no loading flash.
  const { template: initialTemplate } = Route.useLoaderData();
  const { data: template, isLoading } = useQuery({
    queryKey: ["template", slug],
    queryFn: () => fetchTemplate(slug),
    initialData: initialTemplate,
    staleTime: 5 * 60_000,
  });

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  if (!template)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Template not found.{" "}
        <Link to="/marketplace" className="underline ml-2">
          Back
        </Link>
      </div>
    );

  const features = normalizeFeatures(template.features);
  const descBlocks = parseDescription(template.description);
  const industryName = (template as any).industries?.name as string | undefined;
  const previewUrl = template.preview_url || DEFAULT_PREVIEW;

  const handleBuy = () => {
    if (!user) navigate({ to: "/auth", search: { redirect: `/customize/${slug}` } as any });
    else navigate({ to: "/customize/$slug", params: { slug } });
  };

  const pickDevice = (d: Device) => {
    setDeviceLocked(true);
    setDevice(d);
  };

  const deviceClasses: Record<Device, string> = {
    desktop: "w-full aspect-[16/10]",
    tablet: "w-full aspect-[3/4]",
    mobile: "w-full h-[600px] sm:h-[680px]",
  };

  const quickFacts = [
    ...(industryName ? [{ icon: Layers, label: "Industry", value: industryName }] : []),
    { icon: Clock, label: "Delivery", value: "3–5 business days" },
    { icon: RefreshCw, label: "Revisions", value: "2 free rounds" },
    { icon: Globe, label: "Hosting & SSL", value: "Included" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Top bar */}
        <div className="border-b border-border/60 bg-background/60 backdrop-blur-xl sticky top-16 z-30">
          <div className="container-page py-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Link
                to="/marketplace"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ← Marketplace
              </Link>
              <div className="flex items-center gap-3 mt-1">
                <h1 className="text-lg md:text-xl font-semibold tracking-tight truncate">
                  {template.name}
                </h1>
                {industryName && (
                  <span className="hidden sm:inline text-[10px] uppercase tracking-widest text-muted-foreground border border-border/70 rounded-full px-2 py-0.5">
                    {industryName}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {previewUrl && (
                <Button asChild size="sm" variant="outline" className="rounded-full h-9">
                  <a href={previewUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open preview
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                className="rounded-full h-9 btn-gradient border-0"
                onClick={handleBuy}
              >
                Buy this template
              </Button>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <section className="container-page py-8">
          <div className="flex items-center justify-between mb-4 gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-primary font-medium">
                Live preview
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Interact with the real template. Resize with the device toggle.
              </div>
            </div>
            <div className="inline-flex items-center rounded-full border border-border/70 bg-card/60 backdrop-blur-sm p-1 shrink-0">
              {(
                [
                  { id: "desktop", icon: Monitor },
                  { id: "tablet", icon: Tablet },
                  { id: "mobile", icon: Smartphone },
                ] as { id: Device; icon: any }[]
              ).map((d) => (
                <button
                  key={d.id}
                  onClick={() => pickDevice(d.id)}
                  aria-label={`${d.id} preview`}
                  aria-pressed={device === d.id}
                  className={cn(
                    "h-8 w-9 rounded-full flex items-center justify-center transition-colors",
                    device === d.id
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <d.icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/40 backdrop-blur-sm p-3 md:p-6 glow">
            <div
              className="mx-auto transition-all duration-500"
              style={{
                maxWidth: device === "desktop" ? "100%" : device === "tablet" ? "768px" : "390px",
              }}
            >
              <div className="rounded-xl overflow-hidden border border-border/60 bg-background shadow-2xl">
                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/60 bg-card/60">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
                  <div className="ml-2 flex-1 text-center text-[11px] text-muted-foreground truncate">
                    {previewUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </div>
                </div>
                <div className={cn("relative bg-white", deviceClasses[device])}>
                  {previewUrl ? (
                    <iframe
                      key={device}
                      src={previewUrl}
                      title={`${template.name} live preview`}
                      className="absolute inset-0 h-full w-full"
                      loading="lazy"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                      No preview available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Details grid */}
        <section className="container-page pb-24 grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-12">
            {/* Overview */}
            <div>
              <SectionLabel>Overview</SectionLabel>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {quickFacts.map((f) => (
                  <div
                    key={f.label}
                    className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm p-3.5"
                  >
                    <f.icon className="h-4 w-4 text-primary" />
                    <div className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {f.label}
                    </div>
                    <div className="text-sm font-semibold mt-0.5">{f.value}</div>
                  </div>
                ))}
              </div>

              {descBlocks.length > 0 && (
                <div className="mt-6 space-y-3 max-w-2xl">
                  {descBlocks.map((b, i) =>
                    b.type === "p" ? (
                      <p key={i} className="text-base text-muted-foreground leading-relaxed">
                        {b.text}
                      </p>
                    ) : (
                      <ul key={i} className="space-y-2">
                        {b.items.map((it) => (
                          <li
                            key={it}
                            className="flex items-start gap-2.5 text-sm text-muted-foreground"
                          >
                            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {it}
                          </li>
                        ))}
                      </ul>
                    ),
                  )}
                </div>
              )}
            </div>

            {/* Template features */}
            {features.length > 0 && (
              <div>
                <div className="flex items-end justify-between gap-3">
                  <SectionLabel>What's in this template</SectionLabel>
                  <span className="text-xs text-muted-foreground">
                    {features.length} feature{features.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="mt-4 grid sm:grid-cols-2 gap-3">
                  {features.map((f) => (
                    <li
                      key={f.title}
                      className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm p-4"
                    >
                      <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-snug">{f.title}</div>
                        {f.description && (
                          <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {f.description}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Client dashboard */}
            <div>
              <SectionLabel>Included with every purchase</SectionLabel>
              <div className="mt-4 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm overflow-hidden">
                <div className="p-6 md:p-8">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <LayoutDashboard className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Your website management dashboard</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Run your website from one place — request changes, chat with our team and
                        keep an eye on everything, no technical skills needed.
                      </p>
                    </div>
                  </div>
                  <ul className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                    {[
                      "Request content or design updates in one click",
                      "Live chat with the HooNext support team",
                      "Track purchases, subscription and invoices",
                      "Domain, SSL and hosting status at a glance",
                      "Website traffic & analytics overview",
                      "Cancel or upgrade your plan anytime",
                    ].map((x) => (
                      <li key={x} className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {x}
                      </li>
                    ))}
                  </ul>
                </div>
                <DashboardPreview />
              </div>
            </div>

            {/* Google Business Profile */}
            <div className="rounded-2xl border border-primary/30 bg-[radial-gradient(500px_circle_at_0%_0%,color-mix(in_oklab,var(--brand-blue)_14%,transparent),transparent_60%)] p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Google Business Profile optimization</h3>
                    <p className="mt-1 text-sm text-muted-foreground max-w-md">
                      Get found on Google Search and Maps by customers looking for your services
                      nearby.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5">
                  <Gift className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-bold text-primary">{formatUSD(0)}</span>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Free for now
                  </span>
                </div>
              </div>
              <ul className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                {[
                  "Profile setup or cleanup",
                  "Right categories & service areas",
                  "Optimized business description",
                  "Photos, hours & contact details",
                  "Link between your website and profile",
                  "Tips to collect more reviews",
                ].map((x) => (
                  <li key={x} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {x}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <Trust
                icon={Rocket}
                title="Launch in days"
                text="Ready to go live once we have your info."
              />
              <Trust
                icon={ShieldCheck}
                title="SSL & hosting"
                text="Included with every plan, always on."
              />
              <Trust icon={Zap} title="No lock-in" text="Cancel or migrate any time." />
            </div>
          </div>

          {/* Pricing sidebar */}
          <aside className="lg:sticky lg:top-40 self-start space-y-4 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-6">
            <div className="text-xs uppercase tracking-widest text-primary font-medium">
              Pricing
            </div>

            <div className="rounded-xl border border-border/70 p-4">
              <div className="text-sm font-semibold">Buy & Maintain</div>
              <div className="mt-1">
                <span className="text-3xl font-bold">
                  {formatUSD(template.one_time_price_cents)}
                </span>{" "}
                <span className="text-muted-foreground text-sm">one-time</span>
              </div>
              <div className="text-xs text-muted-foreground">
                + {formatUSD(template.monthly_maintenance_cents)}/mo hosting & maintenance
              </div>
            </div>

            <div className="rounded-xl border border-border/70 p-4">
              <div className="text-sm font-semibold">Subscription</div>
              <div className="mt-1">
                <span className="text-3xl font-bold">
                  {formatUSD(template.subscription_price_cents)}
                </span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <div className="text-xs text-muted-foreground">No upfront payment</div>
            </div>

            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                Included with both plans
              </div>
              <ul className="mt-3 space-y-2.5 text-sm">
                <li className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4 text-primary shrink-0" /> Management
                    dashboard
                  </span>
                  <span className="text-xs font-semibold text-primary">Included</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary shrink-0" /> Google Business Profile
                  </span>
                  <span className="text-xs font-semibold text-primary">{formatUSD(0)}</span>
                </li>
              </ul>
            </div>

            <Button
              size="lg"
              className="w-full rounded-full h-12 btn-gradient border-0"
              onClick={handleBuy}
            >
              {user ? "Continue to checkout" : "Sign in to buy"}
            </Button>
            <div className="text-[11px] text-center text-muted-foreground">
              Secure checkout · Cancel anytime{!user && " · Account required"}
            </div>
          </aside>
        </section>

        {/* What happens after purchase */}
        <section className="border-t border-border/60 bg-card/20">
          <div className="container-page py-16 grid gap-10 lg:grid-cols-[1fr,1.2fr] items-start">
            <div className="lg:sticky lg:top-40">
              <div className="text-xs uppercase tracking-widest text-primary font-medium">
                What happens after purchase
              </div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">
                You're buying a <span className="text-gradient">customized website</span> — not the
                demo.
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                The live preview shows what this template <em>can</em> look like. After you
                purchase, our team tailors it with your branding, content, and requested changes so
                it truly represents your business.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {[
                  "Delivered in 3–5 business days",
                  "2 free revision rounds before launch",
                  "Hosting & SSL included",
                  "Dashboard to manage your website",
                  "Google Business Profile optimization (free)",
                  "Ongoing support included",
                ].map((x) => (
                  <li key={x} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {x}
                  </li>
                ))}
              </ul>
            </div>
            <ol className="space-y-4">
              {[
                {
                  t: "Choose your template",
                  d: "Pick the design that fits your business best from our marketplace.",
                },
                {
                  t: "Tell us about your business",
                  d: "Fill in a quick onboarding form — logo, colors, services, and what you'd like changed.",
                },
                {
                  t: "We customize your template",
                  d: "Our team applies your branding, replaces demo content, and implements your requested changes.",
                },
                {
                  t: "You review the website",
                  d: "Preview your site and request revisions — you get 2 free rounds before launch.",
                },
                {
                  t: "We launch your website",
                  d: "We publish it on your domain with SSL, hosting, and monitoring included — and optimize your Google Business Profile.",
                },
              ].map((s, i) => (
                <li
                  key={s.t}
                  className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-5 flex gap-4"
                >
                  <div className="h-9 w-9 shrink-0 rounded-full bg-primary/15 text-primary font-semibold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-semibold">{s.t}</div>
                    <div className="text-sm text-muted-foreground mt-1">{s.d}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Value / conversion section */}
        <section className="border-t border-border/60 bg-gradient-to-b from-background to-card/30">
          <div className="container-page py-20 space-y-16">
            <div className="max-w-2xl">
              <div className="text-xs uppercase tracking-widest text-primary font-medium">
                Why choose this template
              </div>
              <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
                Everything you need to grow — done for you.
              </h2>
              <p className="mt-3 text-muted-foreground">
                More than a template. Every purchase includes hands-on onboarding, hosting,
                security, and a dedicated dashboard to run your website.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <ValueCard
                icon={TrendingUp}
                title="Convert more visitors"
                text="Built with proven layouts, clear CTAs, and a fast mobile experience — designed to turn traffic into leads."
              />
              <ValueCard
                icon={Search}
                title="SEO-ready from day one"
                text="Structured metadata, semantic HTML, sitemap, and lightning-fast performance. Google will love it."
              />
              <ValueCard
                icon={ShieldCheck}
                title="Enterprise-grade security"
                text="Automatic SSL, DDoS protection, backups, and continuous monitoring on premium infrastructure."
              />
              <ValueCard
                icon={Rocket}
                title="Launch in days, not months"
                text="Send us your business info after checkout and we'll have your site live in 3–5 business days."
              />
              <ValueCard
                icon={Wrench}
                title="5 free updates per year"
                text="Request content, image, or copy changes anytime — first 5 updates each year are on the house."
              />
              <ValueCard
                icon={Headphones}
                title="Priority human support"
                text="Real people, real replies. Live chat inside your dashboard with typical response in a few hours."
              />
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-8 max-w-2xl">
              <Award className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-xl font-semibold">Trusted by growing businesses</h3>
              <div className="mt-4 flex items-center gap-1 text-amber-400">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
                <span className="ml-2 text-sm text-muted-foreground">
                  4.9 / 5 from 300+ customers
                </span>
              </div>
              <blockquote className="mt-5 text-sm text-muted-foreground italic border-l-2 border-primary/40 pl-4">
                "HooNext delivered a website that outperformed our expectations. Booking calls
                tripled in the first month, and their team responded to every update request within
                hours."
              </blockquote>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[linear-gradient(135deg,var(--brand-cyan),var(--brand-violet))]" />
                <div className="text-sm">
                  <div className="font-medium">Sarah M.</div>
                  <div className="text-xs text-muted-foreground">Owner, Northline Roofing</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/30 bg-[radial-gradient(600px_circle_at_50%_0%,color-mix(in_oklab,var(--brand-blue)_18%,transparent),transparent_60%)] p-10 text-center space-y-5">
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
                Ready to launch <span className="text-gradient">{template.name}</span>?
              </h3>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Get your professional website live in days. Cancel anytime.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  size="lg"
                  onClick={handleBuy}
                  className="rounded-full btn-gradient border-0 h-12 px-8"
                >
                  {user ? "Continue to checkout" : "Sign in to buy"}
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full h-12 px-8">
                  <a href={previewUrl} target="_blank" rel="noreferrer noopener">
                    <ExternalLink className="h-4 w-4 mr-2" /> Live preview
                  </a>
                </Button>
              </div>
              <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-xs text-muted-foreground pt-2">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> 300+ businesses
                </span>
                <span>·</span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> 14-day guarantee
                </span>
                <span>·</span>
                <span className="flex items-center gap-1.5">
                  <Headphones className="h-3.5 w-3.5" /> Human support
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-widest text-primary font-medium">{children}</div>
  );
}

/** A lightweight, static mock of the client dashboard so buyers can see what they get. */
function DashboardPreview() {
  const nav = [
    { icon: LayoutDashboard, label: "Overview", active: true },
    { icon: Globe, label: "My website" },
    { icon: Wrench, label: "Update requests" },
    { icon: MessageSquare, label: "Live chat" },
    { icon: CreditCard, label: "Billing" },
    { icon: MapPin, label: "Google profile" },
  ];
  const stats = [
    { label: "Website status", value: "Live", tone: "text-emerald-400" },
    { label: "Visitors (30d)", value: "2,481", tone: "text-foreground" },
    { label: "Open requests", value: "1", tone: "text-foreground" },
  ];
  return (
    <div className="border-t border-border/60 bg-background/40 p-4 md:p-6" aria-hidden="true">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
        Dashboard preview
      </div>
      <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden flex">
        <div className="hidden sm:block w-44 shrink-0 border-r border-border/60 p-3 space-y-1">
          {nav.map((n) => (
            <div
              key={n.label}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs",
                n.active ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground",
              )}
            >
              <n.icon className="h-3.5 w-3.5" /> {n.label}
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0 p-4 space-y-4">
          <div className="grid grid-cols-3 gap-2.5">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-border/60 bg-background/60 p-3">
                <div className="text-[10px] text-muted-foreground truncate">{s.label}</div>
                <div className={cn("mt-1 text-base font-semibold", s.tone)}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border/60 bg-background/60 p-3">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="h-3 w-3" /> Traffic
              </span>
              <span>Last 30 days</span>
            </div>
            <div className="mt-3 flex items-end gap-1.5 h-16">
              {[35, 48, 40, 62, 55, 72, 66, 84, 78, 92].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-primary/40"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-border/60 bg-background/60 p-3 text-xs flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">Update hero text — in progress</span>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/60 p-3 text-xs flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">Support replied 2h ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValueCard({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-6 hover:border-primary/40 transition-colors">
      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 font-semibold">{title}</div>
      <div className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{text}</div>
    </div>
  );
}

function Trust({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm p-4">
      <Icon className="h-4 w-4 text-primary" />
      <div className="mt-2 text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{text}</div>
    </div>
  );
}