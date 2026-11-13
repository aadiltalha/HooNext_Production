import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchPublishedPosts } from "@/lib/public-data";
import { breadcrumbLd, seo } from "@/lib/seo";
import { SiteHeader } from "@/components/marketplace/site-header";
import { SiteFooter } from "@/components/marketplace/site-footer";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/blog/")({
  loader: async () => ({ posts: await fetchPublishedPosts() }),
  component: BlogIndex,
  head: () =>
    seo({
      title: "Blog — Website Tips for Local Businesses | HooNext",
      description: "Guides, tips, and stories on launching and growing a small business website.",
      path: "/blog",
      jsonLd: breadcrumbLd([
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
      ]),
    }),
});

function BlogIndex() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const initial = Route.useLoaderData();
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts", "published"],
    queryFn: fetchPublishedPosts,
    initialData: initial.posts,
    staleTime: 5 * 60_000,
  });

  const categories = useMemo(
    () => Array.from(new Set(posts.map((p: any) => p.category).filter(Boolean))) as string[],
    [posts],
  );

  const filtered = posts.filter((p: any) => {
    if (cat && p.category !== cat) return false;
    if (q) {
      const s = q.toLowerCase();
      return p.title?.toLowerCase().includes(s) || p.excerpt?.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-16 md:py-20">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-widest text-primary font-medium">Blog</div>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight">Insights & guides</h1>
          <p className="mt-3 text-muted-foreground">
            Practical playbooks for launching, growing, and running a business website.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search articles…"
              className="pl-9"
            />
          </div>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCat(null)}
                className={cn(
                  "text-xs rounded-full border px-3 py-1.5 transition-colors",
                  cat === null
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border/70 text-muted-foreground hover:text-foreground",
                )}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={cn(
                    "text-xs rounded-full border px-3 py-1.5 transition-colors",
                    cat === c
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border/70 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/70 bg-card/40 h-72 animate-pulse"
              />
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-20 text-sm text-muted-foreground">
              {posts.length === 0
                ? "No posts published yet. Check back soon."
                : "No posts match your search."}
            </div>
          ) : (
            filtered.map((p: any) => (
              <Link
                key={p.id}
                to="/blog/$slug"
                params={{ slug: p.slug }}
                className="group rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm overflow-hidden transition-all hover:border-primary/40 hover:-translate-y-0.5"
              >
                {p.cover_url ? (
                  <div className="aspect-[16/9] overflow-hidden bg-muted">
                    <img
                      src={p.cover_url}
                      alt={p.title}
                      loading="lazy"
                      className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/9] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--brand-blue)_25%,transparent),color-mix(in_oklab,var(--brand-violet)_25%,transparent))]" />
                )}
                <div className="p-5">
                  {p.category && (
                    <div className="text-[10px] uppercase tracking-widest text-primary font-medium">
                      {p.category}
                    </div>
                  )}
                  <div className="mt-2 text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
                    {p.title}
                  </div>
                  {p.excerpt && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.excerpt}</p>
                  )}
                  <div className="mt-4 text-[11px] text-muted-foreground">
                    {p.published_at ? formatDate(p.published_at) : formatDate(p.created_at)}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
