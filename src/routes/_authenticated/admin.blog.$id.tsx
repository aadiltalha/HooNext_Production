import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BlogEditor } from "@/components/admin/blog-editor";
import { PageLoader } from "@/components/shared/page-loader";

export const Route = createFileRoute("/_authenticated/admin/blog/$id")({
  component: EditBlogPost,
});

function EditBlogPost() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-blog-post", id],
    queryFn: async () => (await supabase.from("blog_posts").select("*").eq("id", id).maybeSingle()).data,
  });
  if (isLoading) return <PageLoader message="Loading post" />;
  if (!data) return <div className="text-muted-foreground">Post not found.</div>;
  return <BlogEditor id={id} initial={data} />;
}
