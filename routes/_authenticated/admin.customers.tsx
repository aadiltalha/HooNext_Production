import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatUSD } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Fragment, useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Globe,
  Receipt,
  Wrench,
  MessageSquare,
  IdCard,
  ShieldCheck,
  ShieldAlert,
  Repeat,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageLoader, Skeleton } from "@/components/shared/page-loader";

export const Route = createFileRoute("/_authenticated/admin/customers")({ component: Customers });

interface ContactRow {
  user_id: string;
  email: string | null;
  email_verified_at: string | null;
  phone: string | null;
  phone_verified_at: string | null;
}

function Customers() {
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const [profiles, contacts] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("contact_verifications").select("*"),
      ]);
      const byUser = new Map<string, ContactRow>(
        ((contacts.data ?? []) as ContactRow[]).map((c) => [c.user_id, c]),
      );
      return (profiles.data ?? []).map((p: any) => ({ ...p, contact: byUser.get(p.id) ?? null }));
    },
  });
  const customers = data ?? [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (c: any) =>
        (c.client_code || "").toLowerCase().includes(term) ||
        (c.full_name || "").toLowerCase().includes(term) ||
        (c.email || "").toLowerCase().includes(term) ||
        (c.contact?.phone || "").replace(/\s/g, "").includes(term.replace(/\s/g, "")) ||
        (c.id || "").toLowerCase().includes(term),
    );
  }, [customers, q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Search by Client ID (HN-000123), name, email or phone. Click a row for the full profile.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search HN-000123, name, email, phone…"
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <PageLoader message="Loading customers" />
      ) : (
        <div className="rounded-2xl border border-border/70 bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-8"></th>
                <th className="text-left px-4 py-3">Client ID</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Verified</th>
                <th className="text-left px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => {
                const open = expanded === c.id;
                return (
                  <Fragment key={c.id}>
                    <tr
                      className={cn(
                        "border-t cursor-pointer hover:bg-accent/30",
                        open && "bg-accent/40",
                      )}
                      onClick={() => setExpanded(open ? null : c.id)}
                    >
                      <td className="pl-3">
                        {open ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-mono font-semibold px-2 py-0.5">
                          <IdCard className="h-3 w-3" /> {c.client_code || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{c.full_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {c.contact?.phone || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <VerifyChips contact={c.contact} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(c.created_at)}</td>
                    </tr>
                    {open && (
                      <tr className="border-t bg-background/60">
                        <td colSpan={7} className="px-6 py-5">
                          <CustomerProfile profile={c} contact={c.contact} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No customers match "{q}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VerifyChips({ contact }: { contact: ContactRow | null }) {
  const chip = (ok: boolean, label: string) => (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border",
        ok
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-amber-500/30 bg-amber-500/10 text-amber-400",
      )}
    >
      {ok ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
      {label}
    </span>
  );
  return (
    <div className="flex gap-1.5">
      {chip(Boolean(contact?.email_verified_at), "Email")}
      {chip(Boolean(contact?.phone_verified_at), "Phone")}
    </div>
  );
}

// ─── Full customer profile (loaded only when a row is expanded) ───────────────
function CustomerProfile({ profile, contact }: { profile: any; contact: ContactRow | null }) {
  const userId: string = profile.id;
  const { data, isLoading } = useQuery({
    queryKey: ["admin-customer-profile", userId],
    staleTime: 30_000,
    queryFn: async () => {
      const [sites, orders, subs, reqs, msgs] = await Promise.all([
        supabase
          .from("customer_sites")
          .select("*, templates(name, industries(name))")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("*, templates(name)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("subscriptions")
          .select("*, customer_sites(site_name)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("site_update_requests")
          .select("*, customer_sites(site_name)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("support_messages")
          .select("id,subject,from_admin,body,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      return {
        sites: (sites.data ?? []) as any[],
        orders: (orders.data ?? []) as any[],
        subs: (subs.data ?? []) as any[],
        reqs: (reqs.data ?? []) as any[],
        msgs: (msgs.data ?? []) as any[],
      };
    },
  });

  const totalPaid = (data?.orders ?? [])
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + (o.amount_cents ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Contact & account */}
      <Card icon={UserRound} title="Contact & account">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <Item label="Name" value={profile.full_name} />
          <Item label="Client ID" value={profile.client_code} mono />
          <Item label="Joined" value={formatDate(profile.created_at)} />
          <Item
            label="Email"
            value={
              <span>
                {profile.email} <Verified at={contact?.email_verified_at} />
              </span>
            }
          />
          <Item
            label="Phone"
            value={
              contact?.phone ? (
                <span>
                  {contact.phone} <Verified at={contact.phone_verified_at} />
                </span>
              ) : (
                <span className="text-muted-foreground">Not provided yet</span>
              )
            }
          />
          <Item label="User ID" value={userId} mono />
          {data && <Item label="Total paid" value={formatUSD(totalPaid)} />}
        </div>
        {!contact && (
          <p className="mt-3 text-xs text-muted-foreground">
            No verification record yet — it is saved when the customer verifies on the customize
            step or completes a purchase.
          </p>
        )}
      </Card>

      {isLoading || !data ? (
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <>
          {/* Websites + onboarding */}
          <Card icon={Globe} title="Websites & onboarding details" count={data.sites.length}>
            {data.sites.length === 0 && <Empty />}
            <div className="space-y-4">
              {data.sites.map((s) => (
                <SiteBlock key={s.id} site={s} />
              ))}
            </div>
          </Card>

          {/* Orders */}
          <Card icon={Receipt} title="Orders & payments" count={data.orders.length}>
            {data.orders.length === 0 ? (
              <Empty />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground uppercase tracking-wide">
                    <tr>
                      <th className="text-left py-1.5 pr-3">Date</th>
                      <th className="text-left py-1.5 pr-3">Template</th>
                      <th className="text-left py-1.5 pr-3">Plan</th>
                      <th className="text-left py-1.5 pr-3">Amount</th>
                      <th className="text-left py-1.5 pr-3">Status</th>
                      <th className="text-left py-1.5">Razorpay payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map((o) => (
                      <tr key={o.id} className="border-t border-border/40">
                        <td className="py-1.5 pr-3 whitespace-nowrap">
                          {formatDate(o.created_at)}
                        </td>
                        <td className="py-1.5 pr-3">{o.templates?.name ?? "—"}</td>
                        <td className="py-1.5 pr-3">{planLabel(o.purchase_option)}</td>
                        <td className="py-1.5 pr-3 font-medium">{formatUSD(o.amount_cents)}</td>
                        <td className="py-1.5 pr-3 capitalize">{o.status}</td>
                        <td className="py-1.5 font-mono text-[10px] text-muted-foreground">
                          {o.razorpay_payment_id ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Subscriptions */}
          <Card icon={Repeat} title="Subscriptions" count={data.subs.length}>
            {data.subs.length === 0 ? (
              <Empty />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.subs.map((sub) => (
                  <div
                    key={sub.id}
                    className="rounded-lg border border-border/60 p-3 text-xs space-y-1"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {sub.customer_sites?.site_name ?? "Website"}
                      </span>
                      <span className="capitalize text-muted-foreground">
                        {String(sub.status).replace("_", " ")}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      {planLabel(sub.purchase_option)} · {formatUSD(sub.monthly_amount_cents)}/mo
                    </div>
                    <div className="text-muted-foreground">
                      Current period ends:{" "}
                      {sub.current_period_end ? formatDate(sub.current_period_end) : "—"}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {sub.razorpay_subscription_id ?? "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Update requests */}
          <Card icon={Wrench} title="Update requests" count={data.reqs.length}>
            {data.reqs.length === 0 ? (
              <Empty />
            ) : (
              <div className="space-y-2">
                {data.reqs.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border/60 p-3 text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="font-medium">
                        {r.title}
                        {r.customer_sites?.site_name ? (
                          <span className="text-muted-foreground font-normal">
                            {" "}
                            · {r.customer_sites.site_name}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-muted-foreground capitalize shrink-0">
                        {String(r.status).replace("_", " ")}
                        {r.billable ? " · billable" : ""}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-1 whitespace-pre-wrap">
                      {r.description}
                    </div>
                    {r.admin_notes && (
                      <div className="mt-1.5 text-primary whitespace-pre-wrap">
                        Admin note: {r.admin_notes}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {formatDate(r.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Messages */}
          <Card icon={MessageSquare} title="Messages" count={data.msgs.length}>
            {data.msgs.length === 0 ? (
              <Empty />
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {data.msgs.map((m) => (
                  <div key={m.id} className="text-xs rounded-lg border border-border/60 p-3">
                    <div className="flex justify-between gap-3">
                      <span className="font-medium">
                        {m.from_admin ? "HooNext" : "Customer"}
                        {m.subject ? (
                          <span className="text-muted-foreground font-normal"> · {m.subject}</span>
                        ) : null}
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        {formatDate(m.created_at)}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-1 whitespace-pre-wrap">{m.body}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function SiteBlock({ site }: { site: any }) {
  const info: any = site.business_info || {};
  const submitted = Boolean(info.submitted_at || info.business_name);
  return (
    <div className="rounded-xl border border-border/60 p-4 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="font-semibold">{site.site_name}</div>
          <div className="text-xs text-muted-foreground">
            {site.templates?.industries?.name} · {site.templates?.name} ·{" "}
            {planLabel(site.purchase_option)}
          </div>
        </div>
        <div className="text-xs text-muted-foreground text-right">
          <div className="capitalize">Status: {String(site.status).replace(/_/g, " ")}</div>
          <div>Domain: {site.domain || "not set"}</div>
          <div>Created {formatDate(site.created_at)}</div>
        </div>
      </div>

      {!submitted ? (
        <div className="text-xs text-muted-foreground">
          Customer hasn't submitted business info yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <Item label="Business" value={info.business_name} />
          <Item label="Contact person" value={info.contact_person} />
          <Item label="Business email" value={info.email} />
          <Item label="Business phone" value={info.phone} />
          <Item label="Address" value={info.address} full />
          <Item label="Services" value={info.services} full multiline />
          <Item label="About" value={info.about} full multiline />
          <Item label="Brand colors" value={info.brand_colors} />
          <Item label="Existing domain" value={info.existing_domain} />
          <Item label="Social links" value={info.social_links} full multiline />
          <Item label="Gallery links" value={info.gallery_urls} full multiline />
          <Item label="Requested changes" value={info.change_requests} full multiline highlight />
          <Item
            label="Submitted"
            value={info.submitted_at ? formatDate(info.submitted_at) : undefined}
          />
          {info.logo_data_url && (
            <div className="sm:col-span-2">
              <div className="text-xs text-muted-foreground">Logo</div>
              <img
                src={info.logo_data_url}
                alt="Logo"
                loading="lazy"
                className="mt-2 h-16 w-16 rounded-lg object-contain bg-white border border-border/70"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── small presentational helpers ─────────────────────────────────────────────
const planLabel = (p: string) =>
  p === "buy_maintain" ? "Buy & Maintain" : p === "subscription" ? "Subscription" : p;

function Verified({ at }: { at?: string | null }) {
  return at ? (
    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
      <ShieldCheck className="h-3 w-3" /> verified {formatDate(at)}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
      <ShieldAlert className="h-3 w-3" /> not verified
    </span>
  );
}

function Empty() {
  return <div className="text-xs text-muted-foreground">None</div>;
}

function Card({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: any;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-primary" />
        <div className="text-sm font-semibold">{title}</div>
        {count !== undefined && (
          <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Item({
  label,
  value,
  full,
  multiline,
  highlight,
  mono,
}: {
  label: string;
  value?: React.ReactNode;
  full?: boolean;
  multiline?: boolean;
  highlight?: boolean;
  mono?: boolean;
}) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className={cn(full && "sm:col-span-2 lg:col-span-3")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-0.5 text-sm font-medium break-words",
          mono && "font-mono text-xs",
          multiline && "whitespace-pre-wrap font-normal",
          highlight && "rounded-lg border border-primary/30 bg-primary/5 p-3",
        )}
      >
        {value}
      </div>
    </div>
  );
}
