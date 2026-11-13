import { Link } from "@tanstack/react-router";
import { formatUSD } from "@/lib/format";
import { ExternalLink } from "lucide-react";

export interface TemplateCardData {
  slug: string;
  name: string;
  industry?: string | null;
  thumbnail_url?: string | null;
  one_time_price_cents: number;
  preview_url?: string | null;
}

const DEFAULT_PREVIEW = "https://preview.themeforest.net/item/techmarket-multidemo-electronics-store-woocommerce-theme/full_screen_preview/20241155";

export function TemplateCard({ t }: { t: TemplateCardData }) {
  const previewHref = t.preview_url || DEFAULT_PREVIEW;
  return (
    <div className="group relative rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-primary/40 hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_color-mix(in_oklab,var(--brand-blue)_50%,transparent)] flex flex-col">
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(600px_circle_at_var(--x,50%)_0%,color-mix(in_oklab,var(--brand-blue)_18%,transparent),transparent_40%)]" />

      {/* Image area — NOT wrapped in Link to avoid nested <a> */}
      <div className="relative block">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          <Link to="/marketplace/$slug" params={{ slug: t.slug }} className="block h-full w-full">
            {t.thumbnail_url ? (
              <img src={t.thumbnail_url} alt={t.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : (
              <div className="h-full w-full bg-[linear-gradient(135deg,color-mix(in_oklab,var(--brand-blue)_18%,transparent),color-mix(in_oklab,var(--brand-violet)_18%,transparent))]" />
            )}
          </Link>
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent pointer-events-none" />
          {t.industry && (
            <div className="absolute top-3 left-3 glass rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider font-medium pointer-events-none">
              {t.industry}
            </div>
          )}
          {/* Preview button — standalone <a>, NOT inside another <a> */}
          <a
            href={previewHref}
            target="_blank"
            rel="noreferrer noopener"
            className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-background/85 backdrop-blur px-3 py-1.5 text-[11px] font-medium border border-border/60 hover:bg-background hover:border-primary/50 transition-colors opacity-0 group-hover:opacity-100 z-10"
          >
            <ExternalLink className="h-3 w-3" /> Live preview
          </a>
        </div>
      </div>

      <div className="relative p-5 space-y-3 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold truncate">{t.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Premium template</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">From</div>
            <div className="text-sm font-semibold text-gradient">{formatUSD(t.one_time_price_cents)}</div>
          </div>
        </div>
        <div className="mt-auto flex items-center gap-2 pt-2">
          <Link
            to="/marketplace/$slug"
            params={{ slug: t.slug }}
            className="flex-1 text-center text-sm font-medium rounded-lg border border-border/70 py-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
          >
            View details
          </Link>
          <a
            href={previewHref}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium btn-gradient border-0 text-background"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Preview
          </a>
        </div>
      </div>
    </div>
  );
}
