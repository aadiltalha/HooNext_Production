import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { formatDate, formatUSD } from "@/lib/format";
import { notifyUser } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ChevronDown, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/orders")({ component: AdminOrders });

type SiteStatus = Database["public"]["Enums"]["site_status"];

const SITE_STATUSES: { value: SiteStatus; label: string }[] = [
  { value: "pending_info", label: "Pending — Awaiting Business Info" },
  { value: "in_setup", label: "In Progress — Setup" },
  { value: "in_development", label: "In Progress — Development" },
  { value: "awaiting_review", label: "Awaiting Client Review" },
  { value: "revision_requested", label: "Revision Requested" },
  { value: "live", label: "Completed — Live" },
];

const STATUS_COLORS: Record<string, string> = {
  pending_info: "text-amber-400",
  in_setup: "text-blue-400",
  in_development: "text-blue-400",
  awaiting_review: "text-violet-400",
  revision_requested: "text-orange-400",
  live: "text-emerald-400",
};

function AdminOrders() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [progressDialog, setProgressDialog] = useState<{ order: any; site: any } | null>(null);
  const [newStatus, setNewStatus] = useState<SiteStatus | "">("");
  const [progressNote, setProgressNote] = useState("");

  const { data = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("*, templates(name), customer_sites(id, site_name, status, domain, user_id)")
        .order("created_at", { ascending: false })
        .limit(300);
      const list = orders ?? [];
      const uids = Array.from(new Set(list.map((o: any) => o.user_id).filter(Boolean)));
      if (uids.length === 0) return list;
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,email,full_name,client_code")
        .in("id", uids as string[]);
      const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      return list.map((o: any) => ({ ...o, profiles: map.get(o.user_id) }));
    },
  });

  const pushProgress = useMutation({
    mutationFn: async () => {
      if (!progressDialog || !newStatus) throw new Error("Select a status");
      const { site, order } = progressDialog;

      const { error } = await supabase
        .from("customer_sites")
        .update({ status: newStatus })
        .eq("id", site.id);
      if (error) throw error;

      const statusLabel = SITE_STATUSES.find((s) => s.value === newStatus)?.label ?? newStatus;
      const customerEmail = order.profiles?.email;
      const customerName = order.profiles?.full_name || "there";

      // In-app notification
      await notifyUser(site.user_id, {
        title: `Website update — ${statusLabel}`,
        body: progressNote || `Your website "${site.site_name}" progress has been updated.`,
        url: `/dashboard/websites/${site.id}`,
        type: "progress",
      });

      // Email notification
      if (customerEmail) {
        await sendEmail({
          to: customerEmail,
          template: "site_progress",
          data: {
            name: customerName,
            site_name: site.site_name,
            status: statusLabel,
            message: progressNote || undefined,
            site_id: site.id,
          },
        });
      }
    },
    onSuccess: () => {
      toast.success("Progress updated — customer notified via app & email");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      setProgressDialog(null);
      setNewStatus("");
      setProgressNote("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Orders</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage orders and push progress updates to customers.
        </p>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-8"></th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Customer</th>
              <th className="text-left px-4 py-3">Template</th>
              <th className="text-left px-4 py-3">Plan</th>
              <th className="text-right px-4 py-3">Amount</th>
              <th className="text-right px-4 py-3">Site Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((o: any) => {
              const site = Array.isArray(o.customer_sites) ? o.customer_sites[0] : o.customer_sites;
              const isOpen = expanded === o.id;

              return (
                <Fragment key={o.id}>
                  <tr className="border-t hover:bg-muted/20 transition-colors">
                    <td
                      className="px-2 py-3 text-muted-foreground cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : o.id)}
                    >
                      <ChevronDown
                        className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
                      />
                    </td>
                    <td
                      className="px-4 py-3 cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : o.id)}
                    >
                      {formatDate(o.created_at)}
                    </td>
                    <td
                      className="px-4 py-3 cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : o.id)}
                    >
                      <div className="font-medium">
                        {o.profiles?.full_name || o.profiles?.email || o.user_id?.slice(0, 8)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {o.profiles?.client_code || "—"}
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : o.id)}
                    >
                      {o.templates?.name}
                    </td>
                    <td
                      className="px-4 py-3 cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : o.id)}
                    >
                      {o.purchase_option === "buy_maintain" ? "Buy & Maintain" : "Subscription"}
                    </td>
                    <td
                      className="px-4 py-3 text-right cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : o.id)}
                    >
                      {formatUSD(o.amount_cents)}
                    </td>
                    <td
                      className="px-4 py-3 text-right cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : o.id)}
                    >
                      {site ? (
                        <span
                          className={cn(
                            "text-xs font-medium capitalize",
                            STATUS_COLORS[site.status] || "text-muted-foreground",
                          )}
                        >
                          {site.status.replace(/_/g, " ")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {site && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full text-xs h-7 gap-1"
                          onClick={() => {
                            setProgressDialog({ order: o, site });
                            setNewStatus(site.status);
                            setProgressNote("");
                          }}
                        >
                          <Send className="h-3 w-3" /> Update
                        </Button>
                      )}
                    </td>
                  </tr>

                  {isOpen && (
                    <tr key={o.id + "-details"} className="bg-muted/20 border-t">
                      <td></td>
                      <td colSpan={7} className="px-4 py-5">
                        <div className="text-xs uppercase tracking-widest text-primary font-medium mb-3">
                          Customer onboarding details
                        </div>
                        {site ? (
                          <OnboardingDetails siteId={site.id} domain={site.domain} />
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No website attached to this order yet.
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {data.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Progress update dialog */}
      <Dialog
        open={!!progressDialog}
        onOpenChange={(o) => {
          if (!o) setProgressDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Push progress update</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm">
              <div className="font-medium">{progressDialog?.site?.site_name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {progressDialog?.order?.profiles?.full_name ||
                  progressDialog?.order?.profiles?.email}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New status</label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as SiteStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status…" />
                </SelectTrigger>
                <SelectContent>
                  {SITE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Message to customer{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                value={progressNote}
                onChange={(e) => setProgressNote(e.target.value)}
                placeholder="Add a note about this progress update…"
                rows={3}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Customer will receive an in-app notification and email with this update.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgressDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => pushProgress.mutate()}
              disabled={!newStatus || pushProgress.isPending}
              className="btn-gradient border-0"
            >
              {pushProgress.isPending ? "Sending…" : "Push update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({
  label,
  value,
  full,
  multiline,
  highlight,
}: {
  label: string;
  value?: string;
  full?: boolean;
  multiline?: boolean;
  highlight?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={cn(full && "sm:col-span-2")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-sm",
          multiline ? "whitespace-pre-wrap" : "font-medium",
          highlight && "rounded-lg border border-primary/30 bg-primary/5 p-3",
        )}
      >
        {value}
      </div>
    </div>
  );
}

// Loaded only when an order row is expanded: business_info can contain a
// base64 logo (up to ~1MB), so it must not ride along on the orders list.
function OnboardingDetails({ siteId, domain }: { siteId: string; domain?: string | null }) {
  const { data: info = {}, isLoading } = useQuery({
    queryKey: ["site-business-info", siteId],
    staleTime: 60_000,
    queryFn: async () =>
      ((
        await supabase.from("customer_sites").select("business_info").eq("id", siteId).maybeSingle()
      ).data?.business_info ?? {}) as any,
  });
  const site = { domain };
  const infoSubmitted = !!(info.submitted_at || info.business_name);
  if (isLoading) return <div className="text-xs text-muted-foreground">Loading details…</div>;
  return (
    <>
      {info.verified_contact && (
        <div className="mb-4 rounded-lg border border-border/60 bg-background/50 p-3 text-sm">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Verified contact
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Email: </span>
              {info.verified_contact.email || "—"}{" "}
              <span
                className={
                  info.verified_contact.email_verified ? "text-emerald-400" : "text-amber-400"
                }
              >
                {info.verified_contact.email_verified ? "✓ verified" : "not verified"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Phone: </span>
              {info.verified_contact.phone || "—"}{" "}
              <span
                className={
                  info.verified_contact.phone_verified ? "text-emerald-400" : "text-amber-400"
                }
              >
                {info.verified_contact.phone_verified ? "✓ verified" : "not verified"}
              </span>
            </div>
          </div>
        </div>
      )}
      {!infoSubmitted ? (
        <div className="text-sm text-muted-foreground">
          Customer hasn't submitted business info yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <Detail label="Business" value={info.business_name} />
          <Detail label="Contact" value={info.contact_person} />
          <Detail label="Email" value={info.email} />
          <Detail label="Phone" value={info.phone} />
          <Detail label="Address" value={info.address} full />
          <Detail label="Services" value={info.services} full multiline />
          <Detail label="About" value={info.about} full multiline />
          <Detail label="Brand colors" value={info.brand_colors} />
          <Detail label="Existing domain" value={info.existing_domain || site?.domain} />
          <Detail label="Social links" value={info.social_links} full multiline />
          <Detail label="Requested changes" value={info.change_requests} full multiline highlight />
          {info.logo_data_url && (
            <div className="sm:col-span-2">
              <div className="text-xs text-muted-foreground">Logo</div>
              <img
                src={info.logo_data_url}
                alt="Logo"
                className="mt-2 h-16 w-16 rounded-lg object-contain bg-white border border-border/70"
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
