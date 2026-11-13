import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchPost } from "@/lib/public-data";
import { articleLd, breadcrumbLd, seo } from "@/lib/seo";
import { SiteHeader } from "@/components/marketplace/site-header";
import { SiteFooter } from "@/components/marketplace/site-footer";
import { PageLoader } from "@/components/shared/page-loader";
import { formatDate } from "@/lib/format";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await fetchPost(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    const post = loaderData?.post as any;
    if (!post)
      return {
        meta: [{ title: "Article — HooNext Blog" }, { name: "robots", content: "noindex" }],
      };
    return seo({
      // Editors can set a dedicated SEO title / meta description in the blog editor.
      title: `${post.seo_title || post.title} | HooNext Blog`,
      description:
        post.meta_description || post.excerpt || "Read the latest from the HooNext team.",
      path: `/blog/${post.slug}`,
      image: post.cover_url,
      type: "article",
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      jsonLd: [
        articleLd(post),
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ]),
      ],
    });
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-24 text-center">
        <h1 className="text-3xl font-bold">Post not found</h1>
        <p className="mt-3 text-muted-foreground">That article may have been removed or renamed.</p>
        <Link to="/blog" className="mt-6 inline-block text-primary hover:underline">
          ← Back to blog
        </Link>
      </main>
      <SiteFooter />
    </div>
  ),
  errorComponent: () => (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      Failed to load post.
    </div>
  ),
});

function BlogDetail() {
  const { slug } = Route.useParams();

  const { post: initialPost } = Route.useLoaderData();
  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const data = await fetchPost(slug);
      if (!data) throw notFound();
      return data;
    },
    initialData: initialPost,
    staleTime: 5 * 60_000,
  });

  const { data: related = [] } = useQuery({
    queryKey: ["blog-related", post?.id, post?.category],
    enabled: !!post,
    queryFn: async () =>
      (
        await supabase
          .from("blog_posts")
          .select("id,slug,title,cover_url,category")
          .eq("status", "published")
          .neq("id", post!.id)
          .eq("category", post!.category ?? "")
          .limit(3)
      ).data ?? [],
  });

  if (isLoading)
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <PageLoader message="Loading article" />
        </main>{" "}
      </div>
    );
  if (!post) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <article className="container-page py-14 md:py-20 max-w-3xl">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to blog
          </Link>
          {post.category && (
            <div className="mt-6 text-xs uppercase tracking-widest text-primary font-medium">
              {post.category}
            </div>
          )}
          <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
            {post.title}
          </h1>
          <div className="mt-4 text-sm text-muted-foreground">
            {post.published_at ? formatDate(post.published_at) : formatDate(post.created_at)}
          </div>
          {post.cover_url && (
            <div className="mt-8 rounded-2xl overflow-hidden border border-border/60 bg-muted">
              <img src={post.cover_url} alt={post.title} className="w-full h-auto" />
            </div>
          )}
          {post.excerpt && (
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed">{post.excerpt}</p>
          )}
          <div
            className="mt-8 prose prose-invert max-w-none prose-headings:tracking-tight prose-p:text-muted-foreground prose-a:text-primary text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: post.content ?? "" }}
          />
        </article>

        {related.length > 0 && (
          <section className="border-t border-border/60 bg-card/20">
            <div className="container-page py-16">
              <div className="text-xs uppercase tracking-widest text-primary font-medium">
                Related
              </div>
              <h2 className="mt-2 text-2xl font-bold">Keep reading</h2>
              <div className="mt-8 grid gap-6 sm:grid-cols-3">
                {related.map((p: any) => (
                  <Link
                    key={p.id}
                    to="/blog/$slug"
                    params={{ slug: p.slug }}
                    className="group rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm overflow-hidden hover:border-primary/40 transition-all"
                  >
                    {p.cover_url && (
                      <div className="aspect-[16/9] overflow-hidden bg-muted">
                        <img
                          src={p.cover_url}
                          alt={p.title}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="text-sm font-semibold group-hover:text-primary transition-colors">
                        {p.title}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
