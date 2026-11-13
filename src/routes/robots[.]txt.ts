import { createFileRoute } from "@tanstack/react-router";

// GET /robots.txt — built from the configured site URL (VITE_SITE_URL), so the
// Sitemap line always matches your real domain.
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const { SITE_URL } = await import("@/lib/site-url");
        const body = [
          "User-agent: *",
          "Allow: /",
          "",
          "# Private areas and utility pages: nothing useful for search engines",
          "Disallow: /dashboard",
          "Disallow: /admin",
          "Disallow: /checkout",
          "Disallow: /customize",
          "Disallow: /review",
          "Disallow: /auth",
          "Disallow: /forgot-password",
          "Disallow: /reset-password",
          "Disallow: /api/",
          "",
          `Sitemap: ${SITE_URL}/sitemap.xml`,
          "",
        ].join("\n");
        return new Response(body, {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
