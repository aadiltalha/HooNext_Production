import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchFeaturedTemplates, fetchIndustries } from "@/lib/public-data";
import { organizationLd, seo, websiteLd } from "@/lib/seo";
import { SiteHeader } from "@/components/marketplace/site-header";
import { SiteFooter } from "@/components/marketplace/site-footer";
import { TemplateCard } from "@/components/marketplace/template-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Fragment, useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  Flag,
  Hammer,
  Lock,
  MonitorSmartphone,
  Paintbrush,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Wrench,
  Zap,
  X,
  Check,
  TrendingUp,
  Quote,
} from "lucide-react";

export const Route = createFileRoute("/")({
  loader: async () => {
    // The home page is mostly static marketing, so if the database hiccups it
    // should still render (just without the dynamic sections) rather than error.
    const [featured, industries] = await Promise.all([
      fetchFeaturedTemplates().catch(() => []),
      fetchIndustries().catch(() => []),
    ]);
    return { featured, industries };
  },
  component: Home,
  head: () =>
    seo({
      title: "HooNext — Premium Websites for Local Service Businesses",
      description:
        "Get a professional website for your roofing, plumbing, cleaning or other local service business — designed, launched and maintained for you. No code, no hassle.",
      path: "/",
      jsonLd: [organizationLd(), websiteLd()],
    }),
});

function Home() {
  const initial = Route.useLoaderData();

  const { data: featured = [] } = useQuery({
    queryKey: ["templates", "featured"],
    queryFn: fetchFeaturedTemplates,
    initialData: initial.featured,
    staleTime: 5 * 60_000,
  });

  const { data: industries = [] } = useQuery({
    queryKey: ["industries"],
    queryFn: fetchIndustries,
    initialData: initial.industries,
    staleTime: 5 * 60_000,
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#07070d]">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <LogoBar />
        <HowItWorksSection />
        <FeaturedTemplates templates={featured} />
        <IndustriesSection industries={industries} />
        <WhyHooNextSection />
        <TestimonialsSection />
        <ComparisonSection />
        <PricingSection />
        <CustomWebsiteSection />
        <FAQSection />
        <FinalCTA />
      </main>
      <SiteFooter />
    </div>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
// Media lives in /public:  /videos/hero-studio.mp4  and  /images/hero/hero-video-poster.jpg
const HERO_VIDEO_SRC = "/videos/hero-studio.mp4";
const HERO_POSTER_SRC = "/images/hero/hero-video-poster.jpg";

function HeroSection() {
  const trustItems = [
    { icon: Zap, label: "48-hour delivery" },
    { icon: ShieldCheck, label: "SSL & hosting included" },
    { icon: Star, label: "Free revisions" },
    { icon: Lock, label: "No long-term contracts" },
  ];

  return (
    <section className="relative isolate overflow-hidden bg-[radial-gradient(ellipse_45%_55%_at_0%_25%,rgba(95,45,183,0.35),transparent_70%),radial-gradient(ellipse_50%_50%_at_100%_10%,rgba(80,36,157,0.22),transparent_70%),radial-gradient(ellipse_90%_70%_at_50%_40%,#130e2d,#060516)]">
      {/* Dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(132,108,209,0.28) 1px, transparent 0)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
        }}
      />
      <HeroBottomWaves />

      <div className="relative mx-auto max-w-7xl px-5 pb-28 pt-28 sm:px-6 sm:pb-36 sm:pt-32 lg:px-8 lg:pb-40 lg:pt-32">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] xl:gap-16">
          {/* ---------- Copy ---------- */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-[#846cd1]/30 bg-[#231d44]/40 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur sm:text-sm">
              <PlayCircle className="h-4 w-4 shrink-0 text-[#cbaaff] sm:h-5 sm:w-5" />
              Professional Websites for Service Businesses
            </div>

            <h1 className="mt-6 text-[2.6rem] font-black leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-[3.6rem] xl:text-[4.25rem]">
              Your business
              <br />
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-[#b981ff] via-[#8483ff] to-[#3e8fff] bg-clip-text text-transparent">
                  deserves better
                </span>
                <svg
                  aria-hidden
                  className="absolute -bottom-1.5 left-0 w-full"
                  height="6"
                  viewBox="0 0 100 6"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0,5 Q25,0 50,5 Q75,0 100,5"
                    stroke="#956afd"
                    strokeOpacity={0.7}
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </span>
              <br />
              than a DIY site.
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[#bdbbd0] sm:text-lg lg:mx-0">
              We build professional websites for roofers, cleaners, plumbers, and local service
              businesses — done for you in 48 hours. You focus on the work. We handle the web.
            </p>

            <div className="mt-9 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center lg:justify-start">
              <Link
                to="/marketplace"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#4733f8] to-[#914dff] px-8 py-4 text-base font-semibold text-white shadow-[0_12px_30px_-8px_rgba(110,70,255,0.65)] transition-transform duration-200 hover:scale-[1.03]"
              >
                Browse templates
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#custom"
                className="inline-flex items-center justify-center gap-2.5 rounded-full border border-[#846cd1]/30 bg-[#231d44]/40 px-8 py-4 text-base font-semibold text-white backdrop-blur transition-colors duration-200 hover:border-[#956afd]/60 hover:bg-[#231d44]/70"
              >
                <Paintbrush className="h-4 w-4 text-[#cbaaff]" />
                Request custom site
              </a>
            </div>
          </div>

          {/* ---------- Video ---------- */}
          <HeroVideo src={HERO_VIDEO_SRC} poster={HERO_POSTER_SRC} />
        </div>

        {/* ---------- Trust row ---------- */}
        <ul className="mt-16 grid grid-cols-2 gap-x-4 gap-y-6 sm:mt-20 md:flex md:flex-wrap md:items-center md:justify-center md:gap-0">
          {trustItems.map(({ icon: Icon, label }, i) => (
            <li
              key={label}
              className={`flex items-center justify-center gap-3 text-sm text-white/85 sm:text-base md:px-8 lg:px-12 ${
                i > 0 ? "md:border-l md:border-[#846cd1]/30" : ""
              }`}
            >
              <Icon className="h-6 w-6 shrink-0 text-[#cbaaff] sm:h-7 sm:w-7" strokeWidth={1.75} />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HeroVideo({ src, poster }: { src: string; poster: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  const play = () => {
    setStarted(true);
    void videoRef.current?.play();
  };

  return (
    <div className="relative mx-auto w-full max-w-2xl lg:max-w-none">
      <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2rem] bg-[#956afd]/20 blur-3xl" />
      <div className="rounded-[1.4rem] bg-gradient-to-br from-[#9060fb] via-[#483eb5]/60 to-[#b97df7] p-[2px] shadow-[0_0_0_1px_rgba(185,125,247,0.35),0_0_40px_rgba(144,96,251,0.45),0_30px_60px_-30px_rgba(0,0,0,0.9)] sm:rounded-[1.75rem]">
        <div className="relative aspect-video overflow-hidden rounded-[calc(1.4rem-2px)] bg-[#0b081e] sm:rounded-[calc(1.75rem-2px)]">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            src={src}
            poster={poster}
            controls={started}
            playsInline
            preload="metadata"
            onPlay={() => setStarted(true)}
            aria-label="See how we build your website"
          />

          {!started && (
            <button
              type="button"
              onClick={play}
              aria-label="Play video"
              className="group absolute inset-0 grid place-items-center bg-black/10 transition-colors hover:bg-transparent focus-visible:outline-none"
            >
              <span className="relative grid h-16 w-16 place-items-center rounded-full bg-[#0b081e]/60 shadow-[0_0_24px_rgba(149,106,253,0.65)] ring-2 ring-[#cbaaff] backdrop-blur-md transition-transform duration-300 group-hover:scale-110 sm:h-20 sm:w-20">
                <span className="absolute inset-0 animate-ping rounded-full ring-2 ring-[#956afd]/50 [animation-duration:2.4s]" />
                <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-white sm:h-8 sm:w-8" aria-hidden>
                  <path d="M7 4.5v15a1 1 0 0 0 1.53.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5Z" />
                </svg>
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroBottomWaves() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full sm:h-32 lg:h-40"
      viewBox="0 0 1440 260"
      preserveAspectRatio="none"
      fill="none"
    >
      <path
        d="M0 170 C 260 90, 470 120, 700 190 S 1180 250, 1440 120"
        stroke="#956afd"
        strokeOpacity={0.55}
        strokeWidth={2}
        style={{ filter: "blur(1px)" }}
      />
      <path
        d="M0 210 C 300 140, 520 170, 760 225 S 1200 260, 1440 160"
        stroke="#cbaaff"
        strokeOpacity={0.25}
        strokeWidth={1.5}
      />
      <path
        d="M1440 0 C 1380 80, 1320 120, 1240 150"
        stroke="#956afd"
        strokeOpacity={0.35}
        strokeWidth={1.5}
      />
    </svg>
  );
}

// ─── LOGO BAR ─────────────────────────────────────────────────────────────────
function LogoBar() {
  const niches = [
    "Roofing",
    "Plumbing",
    "Cleaning",
    "HVAC",
    "Landscaping",
    "Electrical",
    "Painting",
    "Pest Control",
    "Flooring",
    "Handyman",
  ];
  return (
    <div className="border-y border-slate-800/60 bg-slate-900/30 py-5 overflow-hidden">
      <div className="flex gap-10 animate-marquee whitespace-nowrap">
        {[...niches, ...niches].map((n, i) => (
          <span
            key={i}
            className="text-xs uppercase tracking-widest text-slate-600 font-medium shrink-0"
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────
// Images live in /public/images/how-it-works/
type JourneyStep = { image: string; title: string; body: string };

const journeySteps: JourneyStep[] = [
  {
    image: "/images/how-it-works/hiw-laptop-site.png",
    title: "See your site live — free",
    body: "Pick a template and see a live preview with your business details.",
  },
  {
    image: "/images/how-it-works/hiw-card.png",
    title: "Choose your plan & pay",
    body: "Like what you see? Choose Buy & Maintain or our monthly subscription. Secure checkout — takes 2 minutes.",
  },
  {
    image: "/images/how-it-works/hiw-headset.png",
    title: "We reach out & understand your needs",
    body: "Once your purchase is complete, our team connects with you to understand your business, services, brand, and any specific requirements.",
  },
  {
    image: "/images/how-it-works/hiw-customize.png",
    title: "We customize your website",
    body: "Our team customizes your purchased template with your content, branding, images, and required changes.",
  },
  {
    image: "/images/how-it-works/hiw-live.png",
    title: "Live in 48 hours",
    body: "We build, test, and launch your fully customized website with hosting, SSL, and your domain configured.",
  },
];
const JOURNEY_CAR = "/images/how-it-works/hiw-car.png";

/*
 * Desktop road geometry (SVG viewBox 0 0 100 600).
 * Each card spans 2 of 6 equal grid rows, alternating sides, so card i is
 * vertically centred at y = 100 * (i + 1). Change steps + geometry together.
 */
const VB_H = 600;
const PEAK_RIGHT = 88;
const PEAK_LEFT = 12;
const isRight = (i: number) => i % 2 === 0;
const peakX = (i: number) => (isRight(i) ? PEAK_RIGHT : PEAK_LEFT);
const peakY = (i: number) => 100 * (i + 1);
const ROAD_START = { x: 70, y: -45 };
const ROAD_END = { x: 30, y: 680 };

function buildRoadPath() {
  let d = `M ${ROAD_START.x} ${ROAD_START.y} C ${ROAD_START.x} 20, ${peakX(0)} 30, ${peakX(0)} ${peakY(0)}`;
  for (let i = 0; i < journeySteps.length - 1; i++) {
    d += ` C ${peakX(i)} ${peakY(i) + 50}, ${peakX(i + 1)} ${peakY(i + 1) - 50}, ${peakX(i + 1)} ${peakY(i + 1)}`;
  }
  const last = journeySteps.length - 1;
  d += ` C ${peakX(last)} ${peakY(last) + 80}, ${ROAD_END.x} ${ROAD_END.y - 90}, ${ROAD_END.x} ${ROAD_END.y}`;
  return d;
}
const ROAD_PATH = buildRoadPath();
const pct = (y: number) => `${(y / VB_H) * 100}%`;

/* ---------- Scroll-driven car ---------- */
// The car sits where this line of the screen (0 = top, 1 = bottom) crosses the road.
const CAR_VIEWPORT_LINE = 0.6;
// Desktop travel range in road units (start flag is at -45, finish flag at 680).
const CAR_MIN_Y = -10;
const CAR_MAX_Y = 640;
const CAR_SAMPLES = 600;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Follows a scroll-based target value with a little easing and calls `onFrame`
 * with the smoothed value. Writes go straight to the DOM, so no re-renders.
 */
function useScrollFollow(getTarget: () => number | null, onFrame: (value: number) => void) {
  const getTargetRef = useRef(getTarget);
  const onFrameRef = useRef(onFrame);
  getTargetRef.current = getTarget;
  onFrameRef.current = onFrame;

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let current: number | null = null;
    let target = 0;
    let raf = 0;

    const tick = () => {
      if (current === null) return;
      const diff = target - current;
      if (reduceMotion || Math.abs(diff) < 0.05) {
        current = target;
        onFrameRef.current(current);
        raf = 0;
        return;
      }
      current += diff * 0.14;
      onFrameRef.current(current);
      raf = requestAnimationFrame(tick);
    };

    const update = () => {
      const next = getTargetRef.current();
      if (next === null) return;
      target = next;
      if (current === null) {
        current = next;
        onFrameRef.current(next);
        return;
      }
      if (!raf) raf = requestAnimationFrame(tick);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(raf);
    };
  }, []);
}

const JOURNEY_CSS = `
@keyframes hn-road-dash { to { stroke-dashoffset: -44; } }
@keyframes hn-road-flow-y { to { background-position: 0 18px; } }
@keyframes hn-node-pulse {
  0%,100% { transform: translate(-50%,-50%) scale(1); }
  50% { transform: translate(-50%,-50%) scale(1.18); }
}
@keyframes hn-car-bob {
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
.hn-road-dash { animation: hn-road-dash 1.6s linear infinite; }
.hn-node-pulse { animation: hn-node-pulse 2.4s ease-in-out infinite; }
.hn-car-bob { animation: hn-car-bob 2.2s ease-in-out infinite; }
.hn-node { background-color: #f8f1ff; box-shadow: 0 0 0 4px rgba(149,106,253,0.55), 0 0 18px 4px rgba(160,110,255,0.7); }
.hn-road-vertical {
  background-color: #1a1339;
  border-left: 2px solid #8860ea;
  border-right: 2px solid #8860ea;
  box-shadow: 0 0 22px rgba(136,96,234,0.45);
}
.hn-road-vertical::after {
  content: ""; position: absolute; left: 50%; top: 0; bottom: 0; width: 2px;
  transform: translateX(-50%);
  background-image: linear-gradient(to bottom, rgba(208,199,242,0.75) 55%, transparent 55%);
  background-size: 2px 18px;
  animation: hn-road-flow-y 1.2s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .hn-road-dash, .hn-node-pulse, .hn-car-bob, .hn-road-vertical::after { animation: none !important; }
}
`;

function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative isolate overflow-hidden bg-[radial-gradient(ellipse_60%_45%_at_75%_20%,rgba(95,45,183,0.22),transparent_70%),radial-gradient(ellipse_50%_40%_at_15%_85%,rgba(95,45,183,0.18),transparent_70%),radial-gradient(ellipse_80%_60%_at_50%_50%,#150e33,#070618)] py-20 sm:py-24 lg:py-28"
    >
      <style>{JOURNEY_CSS}</style>
      <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#956afd] sm:text-sm">
            <span className="h-0.5 w-6 rounded-full bg-[#956afd]" aria-hidden />
            How it works
          </p>
          <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Get your business website live in{" "}
            <span className="bg-gradient-to-r from-[#ab8bff] to-[#e0c1ff] bg-clip-text italic text-transparent">
              48&nbsp;hours.
            </span>
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#bdbbd0] sm:text-lg">
            A simple, done-for-you process — from choosing a template to a fully customized, live
            website for your business.
          </p>
        </div>

        {/* ---------- Desktop: winding road ---------- */}
        <div className="relative mt-6 hidden pb-36 pt-20 lg:block">
          <ol
            className="relative grid grid-cols-[minmax(0,1fr)_clamp(130px,14vw,190px)_minmax(0,1fr)] gap-y-0"
            style={{ gridTemplateRows: `repeat(${journeySteps.length + 1}, minmax(0, 1fr))` }}
          >
            <li
              aria-hidden
              className="relative col-start-2 row-start-1 list-none"
              style={{ gridRowEnd: journeySteps.length + 2 }}
            >
              <DesktopRoad />
            </li>

            {journeySteps.map((s, i) => (
              <li
                key={s.title}
                className={`relative flex list-none items-center py-3 ${
                  isRight(i) ? "col-start-3 pl-1" : "col-start-1 justify-end pr-1"
                }`}
                style={{ gridRowStart: i + 1, gridRowEnd: i + 3 }}
              >
                <JourneyCard step={s} index={i} imageSide={i === 0 ? "right" : "left"} />
              </li>
            ))}
          </ol>
        </div>

        {/* ---------- Mobile / tablet: vertical road ---------- */}
        <div className="relative mt-12 lg:hidden">
          <StartPill />
          <ol className="relative mt-6 space-y-6 pb-4 pl-12 sm:pl-16">
            <span
              aria-hidden
              className="hn-road-vertical absolute -top-6 bottom-0 left-[11px] w-6 rounded-full sm:left-[19px]"
            />
            <MobileRoadCar />
            {journeySteps.map((s, i) => (
              <li key={s.title} className="relative list-none">
                <span
                  aria-hidden
                  className="hn-node absolute -left-[29px] top-9 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full sm:-left-[37px]"
                />
                <span
                  aria-hidden
                  className="absolute -left-[22px] top-9 h-0.5 w-[22px] -translate-y-1/2 bg-[#8860ea] sm:-left-[30px] sm:w-[30px]"
                />
                <JourneyCard step={s} index={i} imageSide="left" compact />
              </li>
            ))}
          </ol>
          <LivePill className="mt-6" />
        </div>
      </div>
    </section>
  );
}

function JourneyCard({
  step,
  index,
  imageSide,
  compact = false,
}: {
  step: JourneyStep;
  index: number;
  imageSide: "left" | "right";
  compact?: boolean;
}) {
  return (
    <article
      className={`group relative w-full overflow-hidden rounded-2xl border border-[#846cd1]/30 bg-gradient-to-br from-[#231c46]/75 to-[#120f29]/60 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#956afd]/60 hover:shadow-[0_24px_60px_-20px_rgba(149,106,253,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] ${
        compact ? "p-5 sm:p-6" : "max-w-[520px] p-5 xl:p-6"
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#956afd]/10 blur-3xl transition-colors duration-300 group-hover:bg-[#956afd]/20"
      />
      <div
        className={`relative flex gap-4 sm:items-center sm:gap-5 ${
          compact ? "flex-col sm:flex-row" : "flex-row items-center"
        } ${imageSide === "right" && !compact ? "flex-row-reverse" : ""}`}
      >
        <div className={`shrink-0 ${compact ? "w-16 sm:w-24" : "w-24 xl:w-32"}`}>
          <img
            src={step.image}
            alt=""
            width={816}
            height={816}
            loading="lazy"
            className="h-auto w-full drop-shadow-[0_10px_20px_rgba(120,60,230,0.45)] transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center rounded-full bg-[#956afd]/30 px-3 py-0.5 text-sm font-bold text-white ring-1 ring-[#956afd]/50">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3 className="mt-2 text-lg font-bold leading-snug text-white xl:text-xl">{step.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[#bdbbd0] xl:text-[0.95rem]">
            {step.body}
          </p>
        </div>
      </div>
    </article>
  );
}

function DesktopRoad() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const carRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<HTMLDivElement>(null);
  const samplesRef = useRef<{ x: number; y: number }[] | null>(null);
  const facingLeftRef = useRef(false);

  // Horizontal road position (0-100) at a given road height (0-600).
  const xAtY = (y: number) => {
    let pts = samplesRef.current;
    if (!pts) {
      const path = pathRef.current;
      if (!path) return null;
      const total = path.getTotalLength();
      if (!total) return null;
      pts = Array.from({ length: CAR_SAMPLES + 1 }, (_, k) => {
        const p = path.getPointAtLength((total * k) / CAR_SAMPLES);
        return { x: p.x, y: p.y };
      });
      samplesRef.current = pts;
    }
    let lo = 0;
    let hi = pts.length - 1;
    if (y <= pts[lo]!.y) return pts[lo]!.x;
    if (y >= pts[hi]!.y) return pts[hi]!.x;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (pts[mid]!.y < y) lo = mid;
      else hi = mid;
    }
    const a = pts[lo]!;
    const b = pts[hi]!;
    const t = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y);
    return a.x + (b.x - a.x) * t;
  };

  useScrollFollow(
    () => {
      const wrap = wrapRef.current;
      if (!wrap) return null;
      const r = wrap.getBoundingClientRect();
      if (r.height === 0) return null; // hidden on small screens
      const y = ((window.innerHeight * CAR_VIEWPORT_LINE - r.top) / r.height) * VB_H;
      return clamp(y, CAR_MIN_Y, CAR_MAX_Y);
    },
    (y) => {
      const car = carRef.current;
      const flip = flipRef.current;
      const x = xAtY(y);
      const ahead = xAtY(y + 4);
      if (!car || !flip || x === null || ahead === null) return;
      car.style.left = `${x}%`;
      car.style.top = pct(y);
      // Turn the car to face the way the road is heading.
      const dx = ahead - x;
      if (Math.abs(dx) > 0.05) {
        const left = dx < 0;
        if (left !== facingLeftRef.current) {
          facingLeftRef.current = left;
          flip.style.transform = left ? "scaleX(-1)" : "scaleX(1)";
        }
      }
    },
  );

  const strokeProps = {
    fill: "none",
    vectorEffect: "non-scaling-stroke" as const,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <svg
        className="absolute inset-0 h-full w-full overflow-visible"
        viewBox={`0 0 100 ${VB_H}`}
        preserveAspectRatio="none"
      >
        <path
          d={ROAD_PATH}
          {...strokeProps}
          stroke="#956afd"
          strokeWidth={46}
          strokeOpacity={0.28}
          style={{ filter: "blur(12px)" }}
        />
        <path d={ROAD_PATH} {...strokeProps} stroke="#8860ea" strokeWidth={34} />
        <path ref={pathRef} d={ROAD_PATH} {...strokeProps} stroke="#1a1339" strokeWidth={30} />
        <path
          d={ROAD_PATH}
          {...strokeProps}
          className="hn-road-dash"
          stroke="rgba(208,199,242,0.75)"
          strokeWidth={2}
          strokeDasharray="14 8"
          strokeLinecap="butt"
        />
      </svg>

      {/* Nodes + connectors to cards */}
      {journeySteps.map((_, i) => (
        <div key={i}>
          <span
            className={`absolute h-0.5 -translate-y-1/2 bg-[#8860ea] shadow-[0_0_24px_rgba(149,106,253,0.65)] ${
              isRight(i) ? "right-0" : "left-0"
            }`}
            style={{
              top: pct(peakY(i)),
              width: `${isRight(i) ? 100 - PEAK_RIGHT : PEAK_LEFT}%`,
            }}
          />
          <span
            className="hn-node hn-node-pulse absolute h-4 w-4 rounded-full"
            style={{
              left: `${peakX(i)}%`,
              top: pct(peakY(i)),
              transform: "translate(-50%, -50%)",
              animationDelay: `${i * 0.35}s`,
            }}
          />
        </div>
      ))}

      {/* Car — drives along the road as you scroll */}
      <div
        ref={carRef}
        className="pointer-events-none absolute z-10 w-[92px] -translate-x-1/2 -translate-y-1/2 will-change-[left,top] xl:w-[108px]"
        style={{ left: `${ROAD_START.x}%`, top: pct(CAR_MIN_Y) }}
      >
        <div ref={flipRef} className="transition-transform duration-500 ease-out">
          <img
            src={JOURNEY_CAR}
            alt=""
            width={816}
            height={816}
            loading="lazy"
            className="hn-car-bob h-auto w-full max-w-none drop-shadow-[0_12px_14px_rgba(0,0,0,0.8)]"
          />
        </div>
      </div>

      {/* Start + finish */}
      <div
        className="absolute z-10"
        style={{ left: `${ROAD_START.x}%`, top: pct(ROAD_START.y), transform: "translate(-50%, -100%)" }}
      >
        <StartPill />
      </div>
      <div
        className="absolute z-10"
        style={{ left: `${ROAD_END.x}%`, top: pct(ROAD_END.y), transform: "translate(-50%, -20%)" }}
      >
        <LivePill />
      </div>
    </div>
  );
}

function MobileRoadCar() {
  const carRef = useRef<HTMLSpanElement>(null);

  useScrollFollow(
    () => {
      const car = carRef.current;
      const track = car?.parentElement;
      if (!car || !track) return null;
      const r = track.getBoundingClientRect();
      if (r.height === 0) return null; // hidden on large screens
      const h = car.offsetHeight;
      return clamp(window.innerHeight * CAR_VIEWPORT_LINE - r.top - h / 2, -h / 2, r.height - h);
    },
    (y) => {
      if (carRef.current) carRef.current.style.transform = `translate3d(-50%, ${y}px, 0)`;
    },
  );

  return (
    <span
      ref={carRef}
      aria-hidden
      className="pointer-events-none absolute left-[23px] top-0 z-10 block w-11 will-change-transform sm:left-[31px] sm:w-12"
      style={{ transform: "translate3d(-50%, 0, 0)" }}
    >
      <img
        src={JOURNEY_CAR}
        alt=""
        width={816}
        height={816}
        loading="lazy"
        className="hn-car-bob h-auto w-full drop-shadow-[0_8px_10px_rgba(0,0,0,0.8)]"
      />
    </span>
  );
}

function StartPill() {
  return (
    <div className="inline-flex items-center gap-2.5 whitespace-nowrap rounded-full border-2 border-[#956afd] bg-[#0b081e]/80 px-5 py-2 text-base font-bold text-white shadow-[0_0_24px_rgba(149,106,253,0.65)] backdrop-blur">
      <Flag className="h-5 w-5 text-[#cbaaff]" strokeWidth={2.25} />
      Start
    </div>
  );
}

function LivePill({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#956afd]/20 shadow-[0_0_24px_rgba(149,106,253,0.65)] ring-1 ring-[#956afd]/60">
        <Flag className="h-5 w-5 text-[#cbaaff]" fill="currentColor" />
      </span>
      <div className="inline-flex items-center gap-2.5 whitespace-nowrap rounded-full border-2 border-[#956afd] bg-[#0b081e]/80 px-5 py-2.5 text-base font-bold text-white shadow-[0_0_24px_rgba(149,106,253,0.65)] backdrop-blur sm:text-lg">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-[#cbaaff]" />
        Your Website is Live
      </div>
    </div>
  );
}

// ─── FEATURED TEMPLATES ───────────────────────────────────────────────────────
function FeaturedTemplates({ templates }: { templates: any[] }) {
  return (
    <section className="py-28 max-w-7xl mx-auto px-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <Eyebrow text="Templates" />
          <h2 className="mt-4 text-4xl md:text-5xl font-black text-white tracking-tight">
            Built for your industry.
          </h2>
          <p className="mt-3 text-slate-400 max-w-lg">
            Every template is purpose-built for a specific trade — not a generic design stretched to
            fit.
          </p>
        </div>
        <Link to="/marketplace">
          <button className="inline-flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            View all templates <ArrowRight className="h-4 w-4" />
          </button>
        </Link>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {templates.length > 0
          ? templates.map((t: any) => <TemplateCard key={t.slug} t={t} />)
          : Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 h-64 animate-pulse"
              />
            ))}
      </div>
    </section>
  );
}

// ─── INDUSTRIES ───────────────────────────────────────────────────────────────

function IndustriesSection({ industries }: { industries: any[] }) {
  if (!industries.length) return null;

  const industryConfig: Record<
    string,
    {
      image: string;
      features: string[];
    }
  > = {
    cleaning: {
      image: "/images/industries/cleaning.jpg",
      features: [
        "Book Appointments",
        "Service Packages",
        "Generate Leads",
      ],
    },
    plumbing: {
      image: "/images/industries/plumbing.png",
      features: [
        "Service Request Forms",
        "Emergency Calls",
        "Location & Service Areas",
      ],
    },
    roofing: {
      image: "/images/industries/roofing.png",
      features: [
        "Get a Free Quote",
        "Showcase Past Projects",
        "Build Trust & Credibility",
      ],
    },
  };

  return (
    <section className="relative isolate overflow-hidden bg-[#080b1a] py-20 sm:py-24 lg:py-28">

      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[450px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/[0.09] blur-[150px]" />

        <div className="absolute bottom-[-180px] left-[-100px] h-[350px] w-[500px] rounded-full bg-indigo-600/10 blur-[130px]" />

        <div className="absolute bottom-[-180px] right-[-100px] h-[350px] w-[500px] rounded-full bg-purple-600/10 blur-[130px]" />

        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(139,92,246,0.5) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage:
              "linear-gradient(to bottom, black, transparent 85%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">

        {/* Section heading */}
        <div className="mx-auto max-w-3xl text-center">

          <div className="mb-6 inline-flex items-center gap-3">
            <span className="h-px w-7 bg-violet-400" />

            <span className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400 sm:text-sm">
              Industries
            </span>

            <span className="h-px w-7 bg-violet-400" />
          </div>

          <h2 className="text-3xl font-black leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-[60px]">
            Website Templates for

            <span className="block bg-gradient-to-r from-indigo-300 via-violet-400 to-purple-300 bg-clip-text text-transparent">
              Service Businesses
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
            Professionally designed, conversion-focused websites
            for popular service industries. Choose your industry
            and get started in minutes.
          </p>
        </div>

        {/* Industry cards */}
        <div className="mt-14 grid gap-6 sm:mt-16 lg:grid-cols-3">

          {industries.map((ind: any, index: number) => {
            const slug = String(ind.slug || "").toLowerCase();

            const config = industryConfig[slug] || {
              image: "/images/industries/cleaning.jpg",
              features: [
                "Professional Design",
                "Lead Generation",
                "Mobile Optimized",
              ],
            };

            const isFeatured = index === 1;

            return (
              <Link
                key={ind.id}
                to="/marketplace"
                search={{ industry: ind.slug } as any}
                className="group block h-full outline-none"
              >
                <article
                  className={`
                    relative flex h-full flex-col overflow-hidden
                    rounded-[26px] border
                    bg-[#101426]/90
                    transition-all duration-500
                    hover:-translate-y-2
                    hover:shadow-[0_25px_70px_rgba(109,40,217,0.18)]
                    focus-visible:ring-2 focus-visible:ring-violet-400
                    ${
                      isFeatured
                        ? "border-violet-400/70 shadow-[0_0_30px_rgba(139,92,246,0.12)]"
                        : "border-white/[0.10] hover:border-violet-400/50"
                    }
                  `}
                >

                  {/* Image area */}
                  <div className="relative h-[225px] overflow-hidden sm:h-[240px]">

                    <img
                      src={config.image}
                      alt={`${ind.name} industry`}
                      loading="lazy"
                      className="
                        absolute inset-0 h-full w-full
                        object-cover
                        transition-transform duration-700
                        group-hover:scale-110
                      "
                    />

                    {/* Image gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#101426] via-[#101426]/85 to-transparent" />

                    <div className="absolute inset-0 bg-gradient-to-t from-[#101426] via-transparent to-transparent" />

                    {/* Industry information */}
                    <div className="absolute inset-0 flex flex-col justify-between p-7">

                      <div className="flex items-start justify-between">

                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/40 bg-violet-500/20 text-violet-300 shadow-lg backdrop-blur-md">
                          <Sparkles className="h-6 w-6" />
                        </div>

                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white/70 backdrop-blur-md transition-all duration-300 group-hover:border-violet-400 group-hover:bg-violet-500 group-hover:text-white">
                          <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-45" />
                        </div>

                      </div>

                      <div>
                        <h3 className="text-2xl font-extrabold tracking-tight text-white sm:text-[27px]">
                          {ind.name}
                        </h3>

                        <p className="mt-2 max-w-[230px] text-sm leading-6 text-slate-300">
                          {ind.description ||
                            `Professional websites built for ${ind.name.toLowerCase()} businesses.`}
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* Card features */}
                  <div className="flex flex-1 flex-col px-7 pb-7">

                    <div className="mb-6 h-px w-full bg-white/[0.09]" />

                    <ul className="space-y-4">
                      {config.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-center gap-3 text-sm text-slate-300"
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-violet-400/60 bg-violet-500/10">
                            <Check className="h-3 w-3 text-violet-300" />
                          </span>

                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <div className="mt-7">

                      <div
                        className={`
                          flex h-[54px] items-center justify-center gap-3
                          rounded-full border text-sm font-bold
                          transition-all duration-300
                          ${
                            isFeatured
                              ? "border-violet-500 bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-[0_8px_25px_rgba(124,58,237,0.25)] group-hover:shadow-[0_8px_35px_rgba(124,58,237,0.45)]"
                              : "border-violet-400/70 bg-transparent text-white group-hover:border-violet-400 group-hover:bg-violet-500/10"
                          }
                        `}
                      >
                        Explore Templates

                        <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                      </div>

                    </div>

                  </div>
                </article>
              </Link>
            );
          })}

        </div>
      </div>
    </section>
  );
}

// ─── WHY HOONEXT ──────────────────────────────────────────────────────────────
function WhyHooNextSection() {
  const features = [
    {
      icon: Sparkles,
      title: "Live preview before you pay",
      body: "See your actual website — with your real business name and services — before committing a single dollar. No other platform does this.",
    },
    {
      icon: Zap,
      title: "48-hour turnaround",
      body: "From payment to a live, indexed website in under 2 days. Most agencies take 3–6 weeks for the same result.",
    },
    {
      icon: MonitorSmartphone,
      title: "Mobile-first, always",
      body: "Every template is designed mobile-first. 70% of your customers search on their phones — we make sure you look great.",
    },
    {
      icon: Hammer,
      title: "Done for you, not DIY",
      body: "You don't touch code, settings, or hosting. We build it, launch it, and maintain it. You just run your business.",
    },
    {
      icon: ShieldCheck,
      title: "SSL, hosting & security",
      body: "Enterprise-grade security, uptime monitoring, and automatic backups on every plan. Your site stays live, always.",
    },
    {
      icon: Wrench,
      title: "Unlimited support requests",
      body: "Need a content change? New service added? Just submit a ticket and we handle it within 48 hours.",
    },
  ];

  return (
    <section className="py-28 max-w-7xl mx-auto px-6">
      <Eyebrow text="Why HooNext" />
      <h2 className="mt-4 text-4xl md:text-5xl font-black text-white tracking-tight max-w-2xl">
        Not a website builder. A website builder team.
      </h2>
      <p className="mt-4 text-slate-400 max-w-xl">
        The gap between DIY builders and expensive agencies — that's where HooNext lives.
      </p>

      <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="group rounded-2xl border border-slate-800 bg-slate-900/40 p-7 hover:border-indigo-500/40 hover:bg-slate-900/80 transition-all"
          >
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-5 font-bold text-white text-lg">{f.title}</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────
function TestimonialsSection() {
  const testimonials = [
    {
      quote:
        "Our roofing quote requests doubled the month we launched. HooNext built something better than what our old agency charged $6k for.",
      name: "James T.",
      business: "Apex Roofing, Texas",
      stars: 5,
    },
    {
      quote:
        "I was embarrassed to give customers my old website. This one actually looks like a real company. Got 3 new bookings in the first week.",
      name: "Priya M.",
      business: "Sparkle Deep Clean, MA",
      stars: 5,
    },
    {
      quote:
        "Setup took a week including the back-and-forth on details. It just works. Google is now sending us leads we weren't getting before.",
      name: "Marcus L.",
      business: "Flowline Plumbing, GA",
      stars: 5,
    },
    {
      quote:
        "I don't know anything about websites. They handled everything. My guys can find us on Google now — that's all I needed.",
      name: "Derek W.",
      business: "Blue Ridge HVAC, NC",
      stars: 5,
    },
    {
      quote:
        "Other agencies wanted $3,000 upfront plus monthly fees. HooNext had my landscaping site live for $249 and it looks incredible.",
      name: "Sofia R.",
      business: "Green Edge Landscaping, FL",
      stars: 5,
    },
    {
      quote:
        "The preview feature sold me. I could see exactly what my plumbing site would look like before I paid. That's how it should work.",
      name: "Tom K.",
      business: "Premier Pipe, OH",
      stars: 5,
    },
  ];

  const accents = ["#f5a524", "#38bdf8", "#4ade80"];
  const initials = (name: string) =>
    name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const TestimonialCard = ({ t, i }: { t: (typeof testimonials)[number]; i: number }) => (
    <div className="group relative w-[340px] shrink-0 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 hover:border-amber-500/30 hover:-translate-y-1 transition-all duration-300">
      <Quote className="absolute top-5 right-5 h-8 w-8 text-zinc-800" />
      <div className="flex gap-0.5">
        {Array.from({ length: t.stars }).map((_, si) => (
          <Star key={si} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="relative mt-4 text-zinc-300 text-sm leading-relaxed pr-6">"{t.quote}"</p>
      <div className="mt-6 pt-5 border-t border-zinc-800 flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0"
          style={{ backgroundColor: accents[i % accents.length] }}
        >
          {initials(t.name)}
        </div>
        <div>
          <div className="font-semibold text-white text-sm">{t.name}</div>
          <div className="text-xs text-zinc-500 mt-0.5">{t.business}</div>
        </div>
      </div>
    </div>
  );

  return (
    <section className="py-28 border-y border-zinc-800/60 bg-zinc-950/40 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <Eyebrow text="Results" />
        <h2 className="mt-4 text-4xl md:text-5xl font-black text-white tracking-tight">
          Local businesses. Real results.
        </h2>
        <p className="mt-3 text-zinc-400">
          What happens when contractors stop relying on word of mouth alone.
        </p>
      </div>

      <div className="mt-12 space-y-5">
        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
          <div className="flex gap-5 w-max animate-marquee hover:[animation-play-state:paused]">
            {[...testimonials, ...testimonials].map((t, i) => (
              <TestimonialCard key={`row1-${i}`} t={t} i={i} />
            ))}
          </div>
        </div>
        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
          <div
            className="flex gap-5 w-max animate-marquee hover:[animation-play-state:paused]"
            style={{ animationDirection: "reverse" }}
          >
            {[...testimonials, ...testimonials].map((t, i) => (
              <TestimonialCard key={`row2-${i}`} t={t} i={i + 1} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

//  ─── COMPARISON (new) ─────────────────────────────────────────────────────────
function ComparisonSection() {
  const rows = [
    {
      label: "Upfront cost",
      hoonext: "$0 to preview, then $249 once or $99/mo",
      diy: "$0–20/mo, but you build it yourself",
      agency: "$2,000–$10,000+",
    },
    {
      label: "Time to launch",
      hoonext: "48 hours, done for you",
      diy: "Days to weeks of your own time",
      agency: "3–8 weeks",
    },
    {
      label: "Who builds it",
      hoonext: "Our team, on a trade-specific template",
      diy: "You, from a generic template",
      agency: "A design team, from scratch",
    },
    {
      label: "Ongoing maintenance",
      hoonext: "Included — submit a ticket, we handle it",
      diy: "You handle updates yourself",
      agency: "Usually a separate retainer",
    },
    {
      label: "Contract terms",
      hoonext: "Cancel anytime, no lock-in",
      diy: "Cancel anytime",
      agency: "Often multi-month contracts",
    },
  ];

  return (
    <section className="py-28 border-y border-zinc-800/60 bg-zinc-950/40">
      <div className="max-w-7xl mx-auto px-6">
        <Eyebrow text="Comparison" />
        <h2 className="mt-4 text-4xl md:text-5xl font-black text-white tracking-tight">
          Where HooNext actually sits.
        </h2>
        <p className="mt-3 text-zinc-400 max-w-lg">
          Not the cheapest DIY tool. Not a $5,000 agency invoice. The done-for-you middle.
        </p>

        <div className="mt-12 overflow-x-auto">
          <div className="min-w-[720px] grid grid-cols-4 rounded-xl border border-zinc-800 overflow-hidden">
            <div className="bg-zinc-950/60 p-5 text-xs font-mono uppercase tracking-wider text-zinc-600 flex items-end">
              Category
            </div>
            <div className="bg-amber-500/[0.07] border-x border-amber-500/20 p-5">
              <div className="text-sm font-bold text-amber-400">HooNext</div>
            </div>
            <div className="bg-zinc-950/60 p-5">
              <div className="text-sm font-bold text-zinc-300">DIY Builder</div>
            </div>
            <div className="bg-zinc-950/60 p-5">
              <div className="text-sm font-bold text-zinc-300">Traditional Agency</div>
            </div>

            {rows.map((r, i) => (
              <Fragment key={r.label}>
                <div
                  className={`p-5 text-sm text-zinc-400 border-t border-zinc-800 ${i % 2 ? "bg-zinc-950/30" : ""}`}
                >
                  {r.label}
                </div>
                <div
                  className={`p-5 text-sm text-zinc-100 border-t border-x border-amber-500/20 bg-amber-500/[0.04] flex items-start gap-2`}
                >
                  <Check className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{r.hoonext}</span>
                </div>
                <div
                  className={`p-5 text-sm text-zinc-400 border-t border-zinc-800 ${i % 2 ? "bg-zinc-950/30" : ""}`}
                >
                  {r.diy}
                </div>
                <div
                  className={`p-5 text-sm text-zinc-400 border-t border-zinc-800 ${i % 2 ? "bg-zinc-950/30" : ""}`}
                >
                  {r.agency}
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── PRICING ──────────────────────────────────────────────────────────────────
function PricingSection() {
  const plans = [
    {
      name: "Subscription",
      price: "$99",
      period: "/month",
      tag: null,
      desc: "No upfront cost. Pay monthly and cancel anytime.",
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
      price: "$249",
      period: "one-time",
      tag: "Most popular",
      desc: "Own your website outright. Pay a small monthly fee for hosting.",
      perks: [
        "Everything in Subscription",
        "You own the site",
        "Lower monthly cost ($29/mo)",
        "Priority support",
        "Free domain for 1 year",
        "2 free revision rounds",
      ],
      cta: "Buy your site",
      highlight: true,
    },
  ];

  return (
    <section id="pricing" className="py-28 max-w-7xl mx-auto px-6">
      <Eyebrow text="Pricing" />
      <h2 className="mt-4 text-4xl md:text-5xl font-black text-white tracking-tight">
        Simple, honest pricing.
      </h2>
      <p className="mt-3 text-slate-400 max-w-lg">
        No hidden fees, no surprise costs. Pick the plan that fits your business.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2 max-w-3xl">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`relative rounded-2xl border p-8 flex flex-col ${
              p.highlight
                ? "border-indigo-500/50 bg-gradient-to-b from-indigo-950/60 to-slate-900/60 shadow-xl shadow-indigo-950/50"
                : "border-slate-800 bg-slate-900/40"
            }`}
          >
            {p.tag && (
              <div className="absolute -top-3 left-8 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1 text-xs font-semibold text-white">
                {p.tag}
              </div>
            )}
            <div className="text-sm font-medium text-slate-400">{p.name}</div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-5xl font-black text-white">{p.price}</span>
              <span className="text-slate-500 text-sm">{p.period}</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">{p.desc}</p>
            <ul className="mt-6 space-y-3 flex-1">
              {p.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  {perk}
                </li>
              ))}
            </ul>
            <Link to="/marketplace" className="mt-8 block">
              <button
                className={`w-full rounded-full py-3 text-sm font-semibold transition-all ${
                  p.highlight
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-lg hover:shadow-indigo-900/50 hover:scale-[1.01]"
                    : "border border-slate-700 bg-slate-800/60 text-slate-200 hover:border-slate-600"
                }`}
              >
                {p.cta}
              </button>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── CUSTOM WEBSITE REQUEST ───────────────────────────────────────────────────
function CustomWebsiteSection() {
  const [form, setForm] = useState({ name: "", email: "", business: "", description: "" });
  const [sent, setSent] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.email || !form.business || !form.description)
        throw new Error("Please fill in all fields");
      const { error } = await supabase.from("contact_submissions").insert({
        name: form.name,
        email: form.email,
        subject: `Custom website request — ${form.business}`,
        message: form.description,
      });
      if (error) throw error;
    },
    onSuccess: () => setSent(true),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <section id="custom" className="py-28 border-y border-slate-800/60 bg-slate-900/20">
      <div className="max-w-7xl mx-auto px-6 grid gap-16 lg:grid-cols-2 items-center">
        <div>
          <Eyebrow text="Custom websites" />
          <h2 className="mt-4 text-4xl md:text-5xl font-black text-white tracking-tight">
            Don't see what you need?
          </h2>
          <p className="mt-5 text-slate-400 leading-relaxed">
            Our templates cover the most common local service businesses — but if your niche isn't
            listed, or you need something built from scratch with a unique design, request a custom
            website.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              "Unique design built from scratch for your brand",
              "Custom functionality — booking, calculators, galleries",
              "E-commerce and payment integration",
              "Multi-location or franchise websites",
              "We quote within 24 hours — no obligation",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
          {sent ? (
            <div className="text-center py-8">
              <div className="h-16 w-16 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-indigo-400" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-white">Request received!</h3>
              <p className="mt-2 text-sm text-slate-400">
                We'll review your details and get back to you within 24 hours with a quote.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Request a custom website</h3>
              <p className="text-sm text-slate-400">
                Fill in your details and we'll get back to you with a custom quote within 24 hours.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">
                    Your name
                  </label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="James Thompson"
                    className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-600 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">
                    Email address
                  </label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="james@apexroofing.com"
                    className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-600 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">
                  Business name & type
                </label>
                <Input
                  value={form.business}
                  onChange={(e) => setForm({ ...form, business: e.target.value })}
                  placeholder="Apex Roofing — Commercial & Residential Roofing"
                  className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-600 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">
                  What do you need built?
                </label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe your business, what features you need, any inspiration sites, and your budget if you have one..."
                  rows={4}
                  className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-600 rounded-lg resize-none"
                />
              </div>
              <button
                onClick={() => submit.mutate()}
                disabled={submit.isPending}
                className="w-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-indigo-900/50 disabled:opacity-60"
              >
                {submit.isPending ? "Submitting…" : "Send custom request →"}
              </button>
              <p className="text-xs text-center text-slate-600">
                No obligation. We'll quote within 24 hours.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function FAQSection() {
  const faqs = [
    {
      q: "How does the free preview work?",
      a: "Pick any template, enter your business name, and we generate a live version of the site with your real info injected. You see exactly what your website will look like — no payment needed to preview.",
    },
    {
      q: "How long does it actually take to go live?",
      a: "Once you pay and submit your business details, we build and launch your site within 48 hours. Most clients are live the next business day.",
    },
    {
      q: "What's the difference between Buy & Maintain vs Subscription?",
      a: "Buy & Maintain means you pay $249 once and own the site — then just $29/month for hosting and maintenance. Subscription is $99/month with no upfront cost. Both include hosting, SSL, and support.",
    },
    {
      q: "Can I use my own domain?",
      a: "Yes. You can connect your existing domain or we'll help you purchase one. Domain setup is included in both plans.",
    },
    {
      q: "What if I need changes after launch?",
      a: "Submit a support ticket through your dashboard. You get 2 free revision rounds included. After that, updates are handled at our standard rate or included in your maintenance plan.",
    },
    {
      q: "Do you work with businesses outside the US?",
      a: "Currently we focus exclusively on US-based local businesses. This lets us ensure fast delivery and quality for our core market.",
    },
  ];

  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-28 max-w-7xl mx-auto px-6">
      <div className="grid gap-16 lg:grid-cols-[1fr,2fr]">
        <div>
          <Eyebrow text="FAQ" />
          <h2 className="mt-4 text-4xl font-black text-white tracking-tight">Common questions.</h2>
          <p className="mt-3 text-slate-400">
            Can't find what you're looking for?{" "}
            <a href="#custom" className="text-indigo-400 hover:underline">
              Contact us
            </a>
            .
          </p>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div
              key={f.q}
              className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full text-left flex items-center justify-between gap-4 px-6 py-5 text-sm font-semibold text-white hover:text-indigo-300 transition-colors"
              >
                {f.q}
                <span
                  className={`text-slate-500 transition-transform duration-200 text-lg font-light shrink-0 ${open === i ? "rotate-45" : ""}`}
                >
                  +
                </span>
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-sm text-slate-400 leading-relaxed border-t border-slate-800 pt-4">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FINAL CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="py-20 max-w-7xl mx-auto px-6 pb-32">
      <div className="relative rounded-3xl overflow-hidden border border-indigo-500/20 bg-gradient-to-br from-indigo-950/80 via-slate-900/80 to-violet-950/80 px-10 py-20 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)",
            backgroundSize: "30px 30px",
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs text-indigo-300 mb-6">
            <Zap className="h-3 w-3" /> Launch your site this week
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight max-w-3xl mx-auto">
            Your competitors already have a website.
          </h2>
          <p className="mt-5 text-slate-400 max-w-xl mx-auto text-lg">
            Every day without one is a lead going to someone else. Let's fix that — starting today.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/marketplace">
              <button className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-indigo-900/50 transition-all hover:shadow-indigo-900/70 hover:scale-[1.02]">
                Browse templates
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </Link>
            <a href="#custom">
              <button className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/60 px-8 py-4 text-sm font-semibold text-slate-200 transition-all hover:border-slate-500">
                Request custom site
              </button>
            </a>
          </div>
          <p className="mt-6 text-xs text-slate-600">
            Free preview · No credit card until you're happy · 48-hour delivery
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function Eyebrow({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-indigo-400 font-semibold">
      <span className="h-px w-5 bg-gradient-to-r from-transparent to-indigo-400" />
      {text}
    </div>
  );
}