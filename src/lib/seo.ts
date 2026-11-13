// SEO helpers: one place that produces consistent <head> data (title,
// description, canonical, Open Graph, Twitter, robots) and JSON-LD structured
// data, so every page is indexable, shareable, and described the same way.
import { SITE_URL } from "@/lib/site-url";

export const SITE_NAME = "HooNext";
const DEFAULT_IMAGE = "/logo/hoonext-logo-desktop.png";

export const absoluteUrl = (pathOrUrl: string): string => {
  try {
    return new URL(pathOrUrl, SITE_URL + "/").toString();
  } catch {
    return SITE_URL;
  }
};

// Search engines show ~60 title / ~155 description characters.
const clip = (s: string, max: number) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
};

export interface SeoOptions {
  title: string;
  description: string;
  /** Path of this page, e.g. "/pricing" (used for the canonical + og:url). */
  path: string;
  image?: string | null;
  type?: "website" | "article";
  /** Private / utility pages (sign-in, checkout…) must not be indexed. */
  noindex?: boolean;
  jsonLd?: object | object[];
  publishedTime?: string | null;
  modifiedTime?: string | null;
}

/** Return value is accepted directly by a TanStack route's `head`. */
export function seo(o: SeoOptions) {
  const url = absoluteUrl(o.path);
  const description = clip(o.description, 160);
  const image = absoluteUrl(o.image || DEFAULT_IMAGE);
  const meta: Array<Record<string, string>> = [
    { title: o.title },
    { name: "description", content: description },
    {
      name: "robots",
      content: o.noindex
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large, max-snippet:-1",
    },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:type", content: o.type ?? "website" },
    { property: "og:title", content: o.title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: o.title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];
  if (o.type === "article") {
    if (o.publishedTime)
      meta.push({ property: "article:published_time", content: o.publishedTime });
    if (o.modifiedTime) meta.push({ property: "article:modified_time", content: o.modifiedTime });
  }
  return {
    meta,
    links: [{ rel: "canonical", href: url }],
    scripts: o.jsonLd ? [{ type: "application/ld+json", children: safeJson(o.jsonLd) }] : [],
  };
}

/** Private pages: keep them out of search results. */
export const noindexHead = (title: string) => ({
  meta: [{ title }, { name: "robots", content: "noindex, nofollow" }],
});

// JSON inside <script> must not be able to close the tag.
function safeJson(data: object | object[]): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028|\u2029/g, "");
}

// ─── JSON-LD builders (schema.org) ───────────────────────────────────────────
export const organizationLd = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl("/logo/hoonext-logo-desktop.png"),
  description:
    "HooNext builds and maintains professional websites for local service businesses — roofing, plumbing, cleaning and more.",
});

export const websiteLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
});

export const breadcrumbLd = (items: Array<{ name: string; path: string }>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    item: absoluteUrl(it.path),
  })),
});

export const faqLd = (faqs: Array<{ q: string; a: string }>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});

interface TemplateLike {
  name: string;
  slug: string;
  description?: string | null;
  thumbnail_url?: string | null;
  one_time_price_cents: number;
  subscription_price_cents: number;
  industries?: { name?: string | null } | null;
}

export const productLd = (t: TemplateLike) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name: t.name,
  sku: t.slug,
  description:
    t.description || `${t.name} — a professionally designed website template from ${SITE_NAME}.`,
  image: t.thumbnail_url ? absoluteUrl(t.thumbnail_url) : absoluteUrl(DEFAULT_IMAGE),
  category: t.industries?.name ?? undefined,
  brand: { "@type": "Brand", name: SITE_NAME },
  url: absoluteUrl(`/marketplace/${t.slug}`),
  offers: [
    {
      "@type": "Offer",
      name: "Buy & Maintain",
      price: (t.one_time_price_cents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: absoluteUrl(`/marketplace/${t.slug}`),
    },
    {
      "@type": "Offer",
      name: "Monthly subscription",
      price: (t.subscription_price_cents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: absoluteUrl(`/marketplace/${t.slug}`),
    },
  ],
});

interface PostLike {
  title: string;
  slug: string;
  excerpt?: string | null;
  cover_url?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
}

export const articleLd = (p: PostLike) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: clip(p.title, 110),
  description: p.excerpt ?? undefined,
  image: p.cover_url ? [absoluteUrl(p.cover_url)] : undefined,
  datePublished: p.published_at ?? undefined,
  dateModified: p.updated_at ?? p.published_at ?? undefined,
  mainEntityOfPage: absoluteUrl(`/blog/${p.slug}`),
  author: { "@type": "Organization", name: SITE_NAME },
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    logo: { "@type": "ImageObject", url: absoluteUrl(DEFAULT_IMAGE) },
  },
});

export const itemListLd = (items: Array<{ name: string; path: string }>) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    url: absoluteUrl(it.path),
  })),
});
