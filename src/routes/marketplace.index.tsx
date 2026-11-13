import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { fetchIndustries, fetchTemplates } from "@/lib/public-data";
import { breadcrumbLd, itemListLd, seo } from "@/lib/seo";
import { SiteHeader } from "@/components/marketplace/site-header";
import { SiteFooter } from "@/components/marketplace/site-footer";
import { TemplateCard } from "@/components/marketplace/template-card";
import { cn } from "@/lib/utils";

const search = z.object({ industry: z.string().optional() });

export const Route = createFileRoute("/marketplace/")({
  validateSearch: search,
  // Server-loaded so crawlers get the actual template list.
  loaderDeps: ({ search }) => ({ industry: search.industry }),
  loader: async ({ deps }) => {
    const [industries, templates] = await Promise.all([
      fetchIndustries(),
      fetchTemplates(deps.industry),
    ]);
    return { industries, templates };
  },
  component: Marketplace,
  head: ({ loaderData, match }) => {
    const industry = (match.search as { industry?: string }).industry;
    const templates = (loaderData?.templates ?? []) as Array<{ name: string; slug: string }>;
    return seo({
      title: "Website Templates for Local Service Businesses | HooNext",
      description:
        "Browse premium website templates for roofers, plumbers, cleaners and other local service businesses. We customize, launch and maintain your site for you.",
      path: "/marketplace",
      // Filtered views are thin duplicates of the main list: keep them out of the index.
      noindex: Boolean(industry),
      jsonLd: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Templates", path: "/marketplace" },
        ]),
        ...(templates.length
          ? [itemListLd(templates.map((t) => ({ name: t.name, path: `/marketplace/${t.slug}` })))]
          : []),
      ],
    });
  },
});

function Marketplace() {
  const { industry } = Route.useSearch();

  const initial = Route.useLoaderData();

  const { data: industries = [] } = useQuery({
    queryKey: ["industries"],
    queryFn: fetchIndustries,
    initialData: initial.industries,
    staleTime: 5 * 60_000,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["templates", industry ?? "all"],
    queryFn: () => fetchTemplates(industry),
    initialData: initial.templates,
    staleTime: 5 * 60_000,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-16">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-accent font-medium">
            Marketplace
          </div>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight">
            Premium business websites
          </h1>
          <p className="mt-3 text-muted-foreground">
            Filter by industry to find a template built for your work.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <FilterChip active={!industry} to={{ to: "/marketplace" }}>
            All
          </FilterChip>
          {industries.map((i: any) => (
            <FilterChip
              key={i.id}
              active={industry === i.slug}
              to={{ to: "/marketplace", search: { industry: i.slug } }}
            >
              {i.name}
            </FilterChip>
          ))}
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t: any) => (
            <TemplateCard key={t.slug} t={t} />
          ))}
        </div>
        {templates.length === 0 && (
          <div className="text-sm text-muted-foreground py-12 text-center">No templates yet.</div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function FilterChip({
  children,
  active,
  to,
}: {
  children: React.ReactNode;
  active: boolean;
  to: any;
}) {
  return (
    <Link
      {...to}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm transition-colors",
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-background border-border hover:border-foreground/40",
      )}
    >
      {children}
    </Link>
  );
}
