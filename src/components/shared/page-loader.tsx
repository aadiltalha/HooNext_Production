import { cn } from "@/lib/utils";

// Lightweight loading state: a soft shimmering skeleton + tiny spinner.
// Replaces the old multi-second "building your website" animation, which was
// being shown for every data fetch and made pages feel slow.
export function PageLoader({
  message,
  fullScreen,
  className,
}: {
  message?: string;
  fullScreen?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "w-full flex flex-col items-center justify-center gap-5 py-16",
        fullScreen && "min-h-screen",
        className,
      )}
    >
      <div className="w-full max-w-md space-y-3" aria-hidden="true">
        <div className="skeleton h-5 w-2/5 rounded-md" />
        <div className="skeleton h-3 w-full rounded-md" />
        <div className="skeleton h-3 w-11/12 rounded-md" />
        <div className="skeleton h-3 w-3/5 rounded-md" />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-3.5 w-3.5 rounded-full border-2 border-primary/70 border-t-transparent animate-spin" />
        {message ?? "Loading"}
      </div>
    </div>
  );
}

/** Block placeholder for inline sections (cards, rows). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} aria-hidden="true" />;
}
