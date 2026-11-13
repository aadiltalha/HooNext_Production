import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/shared/image-upload";
import { useState } from "react";
import { toast } from "sonner";
import { formatUSD } from "@/lib/format";
import { Pencil, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/templates")({ component: AdminTemplates });

interface TemplateRow {
  id?: string;
  slug: string;
  name: string;
  industry_id: string | null;
  description: string;
  thumbnail_url: string;
  preview_url: string;
  one_time_price_cents: number;
  monthly_maintenance_cents: number;
  subscription_price_cents: number;
  enabled: boolean;
  featured: boolean;
  features: any[];
}

const empty: TemplateRow = {
  slug: "", name: "", industry_id: null, description: "",
  thumbnail_url: "", preview_url: "",
  one_time_price_cents: 24900, monthly_maintenance_cents: 2900,
  subscription_price_cents: 9900, enabled: true, featured: false, features: [],
};

// Strip any extra fields Supabase joins add (e.g. industries object)
function toRow(t: any): TemplateRow {
  return {
    id: t.id,
    slug: t.slug ?? "",
    name: t.name ?? "",
    industry_id: t.industry_id ?? null,
    description: t.description ?? "",
    thumbnail_url: t.thumbnail_url ?? "",
    preview_url: t.preview_url ?? "",
    one_time_price_cents: t.one_time_price_cents ?? 24900,
    monthly_maintenance_cents: t.monthly_maintenance_cents ?? 2900,
    subscription_price_cents: t.subscription_price_cents ?? 9900,
    enabled: t.enabled ?? true,
    featured: t.featured ?? false,
    features: Array.isArray(t.features) ? t.features : [],
  };
}

function AdminTemplates() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateRow>(empty);

  const { data: industries = [] } = useQuery({
    queryKey: ["industries"],
    queryFn: async () =>
      (await supabase.from("industries").select("*").order("name")).data ?? [],
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["admin-templates"],
    queryFn: async () =>
      (await supabase.from("templates")
        .select("*, industries(name)")
        .order("created_at", { ascending: false })).data ?? [],
  });

  const save = useMutation({
    mutationFn: async (row: TemplateRow) => {
      const { id, ...payload } = row;
      if (id) {
        const { error } = await supabase.from("templates").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("templates").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing.id ? "Template updated" : "Template created");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-templates"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-templates"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleEnabled = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("templates").update({ enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-templates"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => { setEditing(empty); setOpen(true); };
  // Use toRow() to strip joined fields before editing
  const openEdit = (t: any) => { setEditing(toRow(t)); setOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage marketplace templates.</p>
        </div>
        <Button onClick={openNew} className="btn-gradient border-0">
          <Plus className="h-4 w-4 mr-2" /> Add template
        </Button>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 w-16">Image</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Industry</th>
              <th className="text-right px-4 py-3">One-time</th>
              <th className="text-right px-4 py-3">Sub/mo</th>
              <th className="text-center px-4 py-3">Enabled</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t: any) => (
              <tr key={t.id} className="border-t hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  {t.thumbnail_url ? (
                    <img src={t.thumbnail_url} alt={t.name}
                      className="h-10 w-14 rounded-lg object-cover border border-border/60" />
                  ) : (
                    <div className="h-10 w-14 rounded-lg bg-muted border border-border/60" />
                  )}
                </td>
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.industries?.name || "—"}</td>
                <td className="px-4 py-3 text-right">{formatUSD(t.one_time_price_cents)}</td>
                <td className="px-4 py-3 text-right">{formatUSD(t.subscription_price_cents)}</td>
                <td className="px-4 py-3 text-center">
                  <Switch
                    checked={t.enabled}
                    onCheckedChange={(v) => toggleEnabled.mutate({ id: t.id, enabled: v })}
                  />
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost"
                    onClick={() => { if (confirm("Delete template?")) del.mutate(t.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {templates.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  No templates yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Edit template" : "New template"}</DialogTitle>
          </DialogHeader>
          <TemplateForm value={editing} onChange={setEditing} industries={industries} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => save.mutate(editing)}
              disabled={save.isPending}
              className="btn-gradient border-0"
            >
              {save.isPending ? "Saving…" : "Save template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateForm({
  value, onChange, industries,
}: {
  value: TemplateRow;
  onChange: (v: TemplateRow) => void;
  industries: any[];
}) {
  const set = (k: keyof TemplateRow, v: any) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-5 pr-1">
      <div className="space-y-2">
        <Label>Thumbnail image</Label>
        <ImageUpload
          bucket="templates"
          value={value.thumbnail_url}
          onChange={(url) => set("thumbnail_url", url)}
          label="Upload thumbnail"
          hint="Recommended: 800×500px · JPG or WebP · max 5MB"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Roofing Pro"
          />
        </div>
        <div className="space-y-2">
          <Label>Slug</Label>
          <Input
            value={value.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="roofing-pro"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Industry</Label>
        <Select value={value.industry_id || ""} onValueChange={(v) => set("industry_id", v)}>
          <SelectTrigger><SelectValue placeholder="Select industry…" /></SelectTrigger>
          <SelectContent>
            {industries.map((i) => (
              <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={value.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          placeholder="Describe this template…"
        />
      </div>

      <div className="space-y-2">
        <Label>Live preview URL</Label>
        <Input
          value={value.preview_url || ""}
          onChange={(e) => set("preview_url", e.target.value)}
          placeholder="https://preview.example.com"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>One-time ($)</Label>
          <Input
            type="number"
            value={value.one_time_price_cents / 100}
            onChange={(e) => set("one_time_price_cents", Math.round(+e.target.value * 100))}
          />
        </div>
        <div className="space-y-2">
          <Label>Maintenance ($/mo)</Label>
          <Input
            type="number"
            value={value.monthly_maintenance_cents / 100}
            onChange={(e) => set("monthly_maintenance_cents", Math.round(+e.target.value * 100))}
          />
        </div>
        <div className="space-y-2">
          <Label>Subscription ($/mo)</Label>
          <Input
            type="number"
            value={value.subscription_price_cents / 100}
            onChange={(e) => set("subscription_price_cents", Math.round(+e.target.value * 100))}
          />
        </div>
      </div>

      <div className="flex items-center gap-6 pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch checked={value.enabled} onCheckedChange={(v) => set("enabled", v)} />
          <span className="text-sm">Enabled</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch checked={value.featured} onCheckedChange={(v) => set("featured", v)} />
          <span className="text-sm">Featured</span>
        </label>
      </div>
    </div>
  );
}
