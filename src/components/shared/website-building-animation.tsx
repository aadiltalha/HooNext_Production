import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ─── Website Builder Loading Animation ────────────────────────────────────────
// Use this anywhere: <WebsiteBuildingLoader />
// With custom message: <WebsiteBuildingLoader message="Launching your site..." />
// Full screen: <WebsiteBuildingLoader fullScreen />

const STEPS = [
  { label: "Setting up your domain",        icon: "🌐", duration: 1800 },
  { label: "Building page structure",        icon: "🏗️", duration: 2000 },
  { label: "Applying your brand colors",     icon: "🎨", duration: 1600 },
  { label: "Adding your services",           icon: "✅", duration: 1500 },
  { label: "Optimizing for mobile",          icon: "📱", duration: 1700 },
  { label: "Configuring SSL & hosting",      icon: "🔒", duration: 1900 },
  { label: "Almost ready",                   icon: "✨", duration: 1400 },
];

interface Props {
  message?: string;
  fullScreen?: boolean;
  className?: string;
  onComplete?: () => void;
}

export function WebsiteBuildingLoader({ message, fullScreen, className, onComplete }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let step = 0;
    let prog = 0;

    const totalDuration = STEPS.reduce((s, st) => s + st.duration, 0);
    const progInterval = setInterval(() => {
      prog = Math.min(prog + 0.4, 99);
      setProgress(prog);
    }, totalDuration / 250);

    const advance = () => {
      if (step >= STEPS.length) {
        clearInterval(progInterval);
        setProgress(100);
        setTimeout(() => onComplete?.(), 400);
        return;
      }
      setActiveStep(step);
      setTimeout(() => {
        setCompletedSteps((prev) => [...prev, step]);
        step++;
        advance();
      }, STEPS[step]?.duration ?? 1500);
    };

    advance();
    return () => clearInterval(progInterval);
  }, []);

  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-8 p-8", className)}>
      {/* Animated browser mockup */}
      <div className="relative w-72 h-44 rounded-2xl border border-indigo-500/30 bg-slate-900/80 backdrop-blur shadow-2xl shadow-indigo-950/50 overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-800 bg-slate-950/60">
          <div className="h-2 w-2 rounded-full bg-red-500/70" />
          <div className="h-2 w-2 rounded-full bg-amber-500/70" />
          <div className="h-2 w-2 rounded-full bg-emerald-500/70" />
          <div className="flex-1 mx-2 h-4 rounded-full bg-slate-800 flex items-center px-2">
            <span className="text-[8px] text-slate-500 truncate">https://yoursite.hoonext.com</span>
          </div>
        </div>

        {/* Page being built */}
        <div className="p-3 space-y-2">
          {/* Hero bar */}
          <div className={cn(
            "h-10 rounded-lg transition-all duration-700",
            completedSteps.includes(1)
              ? "bg-gradient-to-r from-indigo-600/70 to-violet-600/70"
              : "bg-slate-800 animate-pulse"
          )} />

          {/* Content blocks */}
          <div className="grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className={cn(
                "h-14 rounded-md transition-all duration-700",
                completedSteps.includes(2 + i)
                  ? "bg-slate-700/80"
                  : "bg-slate-800 animate-pulse"
              )} style={{ animationDelay: `${i * 200}ms` }} />
            ))}
          </div>

          {/* Text lines */}
          <div className="space-y-1">
            {[1, 0.7, 0.5].map((w, i) => (
              <div key={i} className={cn(
                "h-1.5 rounded-full transition-all duration-700",
                completedSteps.includes(4)
                  ? "bg-slate-600"
                  : "bg-slate-800 animate-pulse"
              )} style={{ width: `${w * 100}%`, animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        </div>

        {/* Animated cursor */}
        <div className="absolute bottom-4 right-4 h-3 w-3 rounded-full bg-indigo-400 animate-bounce opacity-80" />

        {/* Scan line effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent animate-scan-line" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-72 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400">{message ?? "Building your website"}</span>
          <span className="text-xs font-mono text-indigo-400">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="w-72 space-y-2">
        {STEPS.map((step, i) => {
          const isDone = completedSteps.includes(i);
          const isActive = activeStep === i && !isDone;
          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 text-sm transition-all duration-500",
                isDone ? "text-slate-400" : isActive ? "text-white" : "text-slate-600"
              )}
            >
              <div className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center text-[10px] transition-all shrink-0",
                isDone
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : isActive
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse"
                  : "bg-slate-800 border border-slate-700"
              )}>
                {isDone ? "✓" : isActive ? step.icon : "·"}
              </div>
              <span className={cn("transition-all", isDone && "line-through opacity-50")}>
                {step.label}
              </span>
              {isActive && (
                <div className="flex gap-0.5 ml-auto">
                  {[0, 1, 2].map((d) => (
                    <div
                      key={d}
                      className="h-1 w-1 rounded-full bg-indigo-400 animate-bounce"
                      style={{ animationDelay: `${d * 150}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07070d]/95 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return content;
}

// ─── Smaller inline spinner with building dots ─────────────────────────────────
export function BuildingSpinner({ label = "Building…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-400">
      <div className="relative h-5 w-5">
        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30" />
        <div className="absolute inset-0 rounded-full border-2 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
      </div>
      <span>{label}</span>
      <div className="flex gap-0.5">
        {[0, 1, 2].map((d) => (
          <div key={d} className="h-1 w-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${d * 150}ms` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Page-level skeleton loader ────────────────────────────────────────────────
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-slate-800" />
      <div className="h-4 w-72 rounded-lg bg-slate-800/70" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-800/60" />
        ))}
      </div>
      <div className="h-48 rounded-2xl bg-slate-800/40" />
    </div>
  );
}
