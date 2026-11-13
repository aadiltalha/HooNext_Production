import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/blog/")({ component: AdminBlog });

function AdminBlog() {
  const qc = useQueryClient();
  const { data: posts = [] } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => (await supabase.from("blog_posts").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Post deleted"); qc.invalidateQueries({ queryKey: ["admin-blog-posts"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Blog</h2>
          <p className="text-sm text-muted-foreground mt-1">Write, edit, and publish articles.</p>
        </div>
        <Button asChild className="btn-gradient border-0"><Link to="/admin/blog/new"><Plus className="h-4 w-4 mr-2" /> New post</Link></Button>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Updated</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p: any) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3">
                  {p.cover_url ? (
                    <img src={p.cover_url} alt="" className="h-10 w-14 rounded-lg object-cover border border-border/60" />
                  ) : (
                    <div className="h-10 w-14 rounded-lg bg-muted border border-border/60" />
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{p.title || "Untitled"}</div>
                  <div className="text-xs text-muted-foreground font-mono">/{p.slug}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.category || "—"}</td>
                <td className="px-4 py-3">
                  <span className={cn("text-[10px] uppercase tracking-widest rounded-full px-2 py-0.5",
                    p.status === "published" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(p.updated_at)}</td>
                <td className="px-4 py-3 text-right space-x-1">
                  <Button asChild size="sm" variant="ghost"><Link to="/admin/blog/$id" params={{ id: p.id }}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Link></Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete "${p.title}"?`)) del.mutate(p.id); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {posts.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No posts yet. Create your first article.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}