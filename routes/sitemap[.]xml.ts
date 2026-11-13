import { createFileRoute } from "@tanstack/react-router";

// GET /sitemap.xml — generated from the database, so every template and blog
// post is listed automatically (the old static file only had a few fixed pages).

const STATIC_PAGES: Array<{ path: string; priority: string; changefreq: string }> = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/marketplace", priority: "0.9", changefreq: "daily" },
  { path: "/pricing", priority: "0.8", changefreq: "monthly" },
  { path: "/blog", priority: "0.7", changefreq: "weekly" },
  { path: "/about", priority: "0.6", changefreq: "monthly" },
  { path: "/faq", priority: "0.6", changefreq: "monthly" },
  { path: "/contact", priority: "0.5", changefreq: "yearly" },
  { path: "/support", priority: "0.4", changefreq: "yearly" },
  { path: "/terms", priority: "0.2", changefreq: "yearly" },
  { path: "/privacy", priority: "0.2", changefreq: "yearly" },
  { path: "/cookie-policy", priority: "0.2", changefreq: "yearly" },
  { path: "/refund-policy", priority: "0.2", changefreq: "yearly" },
];

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
const day = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : undefined);

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { SITE_URL } = await import("@/lib/site-url");
        const { supabase } = await import("@/integrations/supabase/client");

        const [templates, posts] = await Promise.all([
          supabase.from("templates").select("slug, updated_at").eq("enabled", true),
          supabase
            .from("blog_posts")
            .select("slug, updated_at, published_at")
            .eq("status", "published"),
        ]);

        const entry = (
          path: string,
          opts: { lastmod?: string; priority: string; changefreq: string },
        ) =>
          `  <url>\n    <loc>${esc(SITE_URL + path)}</loc>\n` +
          (opts.lastmod ? `    <lastmod>${opts.lastmod}</lastmod>\n` : "") +
          `    <changefreq>${opts.changefreq}</changefreq>\n    <priority>${opts.priority}</priority>\n  </url>`;

        const urls = [
          ...STATIC_PAGES.map((p) => entry(p.path, p)),
          ...(templates.data ?? []).map((t) =>
            entry(`/marketplace/${encodeURIComponent(t.slug)}`, {
              lastmod: day(t.updated_at),
              priority: "0.8",
              changefreq: "weekly",
            }),
          ),
          ...(posts.data ?? []).map((p) =>
            entry(`/blog/${encodeURIComponent(p.slug)}`, {
              lastmod: day(p.updated_at ?? p.published_at),
              priority: "0.6",
              changefreq: "monthly",
            }),
          ),
        ];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
        return new Response(xml, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});
