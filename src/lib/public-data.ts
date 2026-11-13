// Public (no sign-in needed) data fetchers.
//
// Used by route LOADERS, which run on the server for the first page view, so
// the HTML that search engines (and slow phones) receive already contains the
// real content instead of a loading skeleton. The same functions are used as
// the pages' query functions, so client-side navigation behaves identically.
//
// IMPORTANT: a database ERROR throws, while "no matching row" returns null.
// That difference matters for SEO: a missing page must answer 404, but a
// temporary outage must answer 5xx. Crawlers retry a 5xx later, whereas a 404
// can get a page removed from search results.
import { supabase } from "@/integrations/supabase/client";

function unwrap<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data;
}

export async function fetchIndustries() {
  return unwrap(await supabase.from("industries").select("*").order("name")) ?? [];
}

export async function fetchFeaturedTemplates() {
  const data = unwrap(
    await supabase
      .from("templates")
      .select("slug,name,thumbnail_url,one_time_price_cents,industries(name)")
      .eq("enabled", true)
      .eq("featured", true)
      .limit(6),
  );
  return (data ?? []).map((t: any) => ({ ...t, industry: t.industries?.name }));
}

export async function fetchTemplates(industry?: string) {
  const data = unwrap(
    await supabase
      .from("templates")
      .select("slug,name,thumbnail_url,preview_url,one_time_price_cents,industries(slug,name)")
      .eq("enabled", true)
      .order("created_at", { ascending: false }),
  );
  const mapped = (data ?? []).map((t: any) => ({
    ...t,
    industry: t.industries?.name,
    industry_slug: t.industries?.slug,
  }));
  return industry ? mapped.filter((t) => t.industry_slug === industry) : mapped;
}

export async function fetchTemplate(slug: string) {
  return unwrap(
    await supabase
      .from("templates")
      .select("*, industries(name,slug)")
      .eq("slug", slug)
      .maybeSingle(),
  );
}

export async function fetchPublishedPosts() {
  return (
    unwrap(
      await supabase
        .from("blog_posts")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false }),
    ) ?? []
  );
}

export async function fetchPost(slug: string) {
  return unwrap(
    await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle(),
  );
}
