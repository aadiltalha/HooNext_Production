import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/shared/image-upload";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { toast } from "sonner";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export interface BlogEditorProps {
  id?: string;
  initial?: any;
}

export function BlogEditor({ id, initial }: BlogEditorProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: "", slug: "", excerpt: "", content: "", cover_url: "",
    category: "", status: "draft", seo_title: "", meta_description: "",
  });

  useEffect(() => {
    if (initial) setForm({
      title: initial.title || "", slug: initial.slug || "",
      excerpt: initial.excerpt || "", content: initial.content || "",
      cover_url: initial.cover_url || "", category: initial.category || "",
      status: initial.status || "draft", seo_title: initial.seo_title || "",
      meta_description: initial.meta_description || "",
    });
  }, [initial]);

  const set = <K extends keyof typeof form>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async (publish: boolean) => {
      if (!form.title.trim()) throw new Error("Title is required");
      const slug = form.slug.trim() || slugify(form.title);
      const status = publish ? "published" : form.status;
      const payload: any = {
        title: form.title, slug, excerpt: form.excerpt || null, content: form.content,
        cover_url: form.cover_url || null, category: form.category || null,
        status, seo_title: form.seo_title || null, meta_description: form.meta_description || null,
        published_at: status === "published" ? (initial?.published_at || new Date().toISOString()) : null,
      };
      if (id) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", id);
        if (error) throw error;
        return { id };
      } else {
        payload.author_id = user?.id;
        const { data, error } = await supabase.from("blog_posts").insert(payload).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (p) => {
      toast.success(id ? "Post saved" : "Post created");
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
      if (!id && p?.id) navigate({ to: "/admin/blog/$id", params: { id: p.id } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{id ? "Edit post" : "New post"}</h2>
          <p className="text-sm text-muted-foreground mt-1">Write engaging content and publish when ready.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save.mutate(false)} disabled={save.isPending}>Save draft</Button>
          <Button className="btn-gradient border-0" onClick={() => save.mutate(true)} disabled={save.isPending}>
            {form.status === "published" ? "Update" : "Publish"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        <div className="space-y-4">
          <Field label="Title">
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="How to launch a website in 3 days" />
          </Field>
          <Field label="Slug">
            <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto-generated from title" />
          </Field>
          <Field label="Excerpt">
            <Textarea rows={2} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} placeholder="Short summary shown in listings." />
          </Field>
          <Field label="Content">
            <RichTextEditor value={form.content} onChange={(html) => set("content", html)} />
          </Field>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-4 space-y-4">
            <Field label="Cover image">
              <ImageUpload
                bucket="blogs"
                value={form.cover_url}
                onChange={(url) => set("cover_url", url)}
                label="Upload cover image"
                hint="Recommended: 1200×630px · max 5MB"
              />
            </Field>
            <Field label="Category">
              <Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Guides" />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => set("status", e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </Field>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-4 space-y-4">
            <div className="text-xs uppercase tracking-widest text-primary font-medium">SEO</div>
            <Field label="SEO title"><Input value={form.seo_title} onChange={(e) => set("seo_title", e.target.value)} /></Field>
            <Field label="Meta description"><Textarea rows={3} value={form.meta_description} onChange={(e) => set("meta_description", e.target.value)} /></Field>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
