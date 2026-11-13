import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { emailAboutMessage } from "@/lib/notify";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { PageLoader } from "@/components/shared/page-loader";
import {
  Bell,
  Check,
  Clock,
  Loader2,
  MessageSquare,
  Rocket,
  ClipboardList,
  Send,
  ShoppingCart,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/websites/$id")({
  component: SiteDetails,
});

type StepState = "done" | "current" | "pending";
interface Step {
  key: string;
  title: string;
  description: string;
  state: StepState;
  icon: any;
}

function computeSteps(status: string, info: any): Step[] {
  const infoSubmitted = !!(info && (info.submitted_at || info.business_name));
  const isInSetup = status === "in_setup";
  const isLive = status === "live";
  const isReview = !!info?.ready_for_review;

  const s = (state: StepState) => state;
  return [
    {
      key: "ordered",
      title: "Order received",
      description: "Payment confirmed — your project is in our queue.",
      state: s("done"),
      icon: Check,
    },
    {
      key: "info",
      title: "Business information submitted",
      description: infoSubmitted
        ? "Thanks — we have everything we need to start."
        : "Add your business details so we can begin.",
      state: infoSubmitted ? s("done") : s("current"),
      icon: ClipboardList,
    },
    {
      key: "setup",
      title: "Website customization in progress",
      description: "Our team is applying your branding, content, and change requests.",
      state:
        isLive || isReview ? s("done") : isInSetup && infoSubmitted ? s("current") : s("pending"),
      icon: Loader2,
    },
    {
      key: "review",
      title: "Ready for your review",
      description: "Preview your site and request revisions — 2 free rounds included.",
      state: isLive ? s("done") : isReview ? s("current") : s("pending"),
      icon: Clock,
    },
    {
      key: "live",
      title: "Website published",
      description: "Your site is live on your domain with SSL and monitoring.",
      state: isLive ? s("current") : s("pending"),
      icon: Rocket,
    },
  ];
}

const REQUEST_COLORS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  in_progress: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
};

interface UpdateRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  billable: boolean;
  admin_notes: string | null;
  created_at: string;
}
interface RequestMessage {
  id: string;
  request_id: string;
  body: string;
  from_admin: boolean;
  created_at: string;
}
interface SupportMessage {
  id: string;
  thread_id: string;
  site_id: string | null;
  subject: string;
  body: string;
  from_admin: boolean;
  created_at: string;
}
interface SiteNotification {
  id: string;
  title: string;
  body: string | null;
  type: string | null;
  created_at: string;
}

interface FeedItem {
  key: string;
  at: string;
  icon: any;
  tone: "primary" | "success" | "muted" | "warn";
  title: string;
  body?: string;
}

/** Everything about this one website, loaded in parallel and refreshed periodically. */
function useSiteActivity(siteId: string, userId: string | undefined) {
  const enabled = !!userId;

  const requests = useQuery({
    queryKey: ["site-requests", siteId],
    enabled,
    refetchInterval: 60_000,
    queryFn: async () =>
      ((
        await supabase
          .from("site_update_requests")
          .select("*")
          .eq("site_id", siteId)
          .order("created_at", { ascending: false })
      ).data ?? []) as UpdateRequest[],
  });

  const requestIds = (requests.data ?? []).map((r) => r.id);
  const requestReplies = useQuery({
    queryKey: ["site-request-messages", siteId, requestIds.join(",")],
    enabled: enabled && requestIds.length > 0,
    refetchInterval: 60_000,
    queryFn: async () =>
      ((
        await supabase
          .from("request_messages")
          .select("*")
          .in("request_id", requestIds)
          .order("created_at", { ascending: true })
      ).data ?? []) as RequestMessage[],
  });

  const notifications = useQuery({
    queryKey: ["site-notifications", siteId, userId],
    enabled,
    refetchInterval: 60_000,
    queryFn: async () =>
      ((
        await supabase
          .from("notifications")
          .select("id,title,body,type,created_at")
          .eq("user_id", userId!)
          .eq("url", `/dashboard/websites/${siteId}`)
          .order("created_at", { ascending: false })
          .limit(50)
      ).data ?? []) as SiteNotification[],
  });

  const support = useQuery({
    queryKey: ["site-support", siteId, userId],
    enabled,
    refetchInterval: 30_000,
    queryFn: async () =>
      ((
        await supabase
          .from("support_messages")
          .select("*")
          .eq("user_id", userId!)
          .order("created_at", { ascending: true })
          .limit(500)
      ).data ?? []) as SupportMessage[],
  });

  // A conversation belongs to this site if any message in its thread is tagged with it
  // (admin replies are not always tagged, so match on thread, not on the row).
  const siteThreadIds = new Set(
    (support.data ?? []).filter((m) => m.site_id === siteId).map((m) => m.thread_id),
  );
  const siteMessages = (support.data ?? []).filter((m) => siteThreadIds.has(m.thread_id));

  return {
    requests: requests.data ?? [],
    requestReplies: requestReplies.data ?? [],
    notifications: notifications.data ?? [],
    siteMessages,
    siteThreadId: [...siteThreadIds][0] as string | undefined,
  };
}

function buildFeed(site: any, a: ReturnType<typeof useSiteActivity>): FeedItem[] {
  const items: FeedItem[] = [
    {
      key: "order",
      at: site.created_at,
      icon: ShoppingCart,
      tone: "success",
      title: "Order placed",
      body: "Payment confirmed — your project entered our queue.",
    },
  ];
  for (const n of a.notifications) {
    items.push({
      key: `n-${n.id}`,
      at: n.created_at,
      icon: n.type === "progress" ? Rocket : Bell,
      tone: "primary",
      title: n.title,
      body: n.body ?? undefined,
    });
  }
  for (const r of a.requests) {
    items.push({
      key: `r-${r.id}`,
      at: r.created_at,
      icon: Wrench,
      tone: "muted",
      title: `Update requested: ${r.title}`,
      body: `Status: ${r.status.replace("_", " ")}`,
    });
  }
  const reqTitle = new Map(a.requests.map((r) => [r.id, r.title]));
  for (const m of a.requestReplies) {
    items.push({
      key: `rm-${m.id}`,
      at: m.created_at,
      icon: MessageSquare,
      tone: m.from_admin ? "primary" : "muted",
      title: `${m.from_admin ? "HooNext replied" : "You wrote"} on “${reqTitle.get(m.request_id) ?? "update request"}”`,
      body: m.body,
    });
  }
  for (const m of a.siteMessages) {
    items.push({
      key: `sm-${m.id}`,
      at: m.created_at,
      icon: MessageSquare,
      tone: m.from_admin ? "primary" : "muted",
      title: m.from_admin ? "HooNext sent you a message" : "You sent a message",
      body: m.body,
    });
  }
  return items.sort((x, y) => +new Date(y.at) - +new Date(x.at)).slice(0, 40);
}

function SiteDetails() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { data: site, isLoading } = useQuery({
    queryKey: ["site", id],
    refetchInterval: 60_000,
    queryFn: async () =>
      (
        await supabase
          .from("customer_sites")
          .select("*, templates(name, industries(name))")
          .eq("id", id)
          .maybeSingle()
      ).data,
  });
  const activity = useSiteActivity(id, user?.id);

  if (isLoading) return <PageLoader message="Loading your website" />;
  if (!site)
    return (
      <div>
        Website not found.{" "}
        <Link to="/dashboard/websites" className="underline">
          Back
        </Link>
      </div>
    );

  const info: any = site.business_info || {};
  const steps = computeSteps(site.status, info);
  const infoSubmitted = !!(info.submitted_at || info.business_name);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link
          to="/dashboard/websites"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All websites
        </Link>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">{site.site_name}</h2>
        <p className="text-sm text-muted-foreground">
          {(site as any).templates?.industries?.name} · {(site as any).templates?.name}
        </p>
      </div>

      {/* Timeline */}
      <section className="rounded-2xl border border-border/70 bg-card p-6">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary font-medium">
              Project timeline
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Follow your website's progress from purchase to launch.
            </div>
          </div>
          <div className="text-xs text-muted-foreground capitalize">
            Status: {site.status.replace("_", " ")}
          </div>
        </div>
        <ol className="space-y-4">
          {steps.map((step) => (
            <li key={step.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center border-2",
                    step.state === "done" && "bg-primary/15 border-primary text-primary",
                    step.state === "current" &&
                      "bg-primary text-primary-foreground border-primary shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand-blue)_25%,transparent)]",
                    step.state === "pending" && "border-border text-muted-foreground bg-background",
                  )}
                >
                  <step.icon
                    className={cn(
                      "h-4 w-4",
                      step.state === "current" && step.key === "setup" && "animate-spin",
                    )}
                  />
                </div>
                <div
                  className={cn(
                    "w-px flex-1 my-1",
                    step.state === "done" ? "bg-primary/40" : "bg-border",
                  )}
                />
              </div>
              <div className="pb-4 flex-1">
                <div
                  className={cn(
                    "font-semibold text-sm",
                    step.state === "pending" && "text-muted-foreground",
                  )}
                >
                  {step.title}
                </div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {step.description}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Details */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-3">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
            Order
          </div>
          <Row
            label="Purchase option"
            value={site.purchase_option === "buy_maintain" ? "Buy & Maintain" : "Subscription"}
          />
          <Row label="Purchase date" value={formatDate(site.created_at)} />
          <Row label="Domain" value={site.domain || "Not set"} />
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-3">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
            Next steps
          </div>
          <div className="flex flex-col gap-2">
            <Link
              to="/dashboard/updates"
              className="rounded-xl border border-border/70 p-3 hover:border-primary/40 transition-colors"
            >
              <div className="text-sm font-semibold">Request an update</div>
              <div className="text-xs text-muted-foreground">
                Content or design changes — 5 free per year.
              </div>
            </Link>
            <a
              href="#messages"
              className="rounded-xl border border-border/70 p-3 hover:border-primary/40 transition-colors"
            >
              <div className="text-sm font-semibold">Message our team</div>
              <div className="text-xs text-muted-foreground">
                Chat about this website — typical reply in a few hours.
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Update requests for this site */}
      <section className="rounded-2xl border border-border/70 bg-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary font-medium">
              Update requests
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Changes you've asked for on this website, and where they stand.
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to="/dashboard/updates">+ Request an update</Link>
          </Button>
        </div>
        {activity.requests.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No update requests yet. Need a change? Request one and we'll take care of it.
          </div>
        ) : (
          <ul className="space-y-3">
            {activity.requests.map((r) => {
              const replies = activity.requestReplies.filter((m) => m.request_id === r.id);
              return (
                <li key={r.id} className="rounded-xl border border-border/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{r.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(r.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.billable && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                          Billable
                        </span>
                      )}
                      <span
                        className={cn(
                          "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border",
                          REQUEST_COLORS[r.status] || "",
                        )}
                      >
                        {r.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                    {r.description}
                  </p>
                  {r.admin_notes && (
                    <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
                      <div className="font-medium text-primary mb-0.5">Note from HooNext</div>
                      <div className="whitespace-pre-wrap">{r.admin_notes}</div>
                    </div>
                  )}
                  <div className="mt-2 text-xs">
                    <Link to="/dashboard/updates" className="text-primary hover:underline">
                      {replies.length > 0
                        ? `View conversation (${replies.length})`
                        : "Open request"}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Messages */}
      <SiteMessages
        site={site}
        userId={user?.id}
        messages={activity.siteMessages}
        threadId={activity.siteThreadId}
      />

      {/* Activity */}
      <section className="rounded-2xl border border-border/70 bg-card p-6">
        <div className="text-xs uppercase tracking-widest text-primary font-medium">Activity</div>
        <div className="text-sm text-muted-foreground mt-1 mb-5">
          Everything that's happened on this website, newest first.
        </div>
        <ol className="space-y-4">
          {buildFeed(site, activity).map((it) => (
            <li key={it.key} className="flex gap-3">
              <div
                className={cn(
                  "mt-0.5 h-8 w-8 shrink-0 rounded-full flex items-center justify-center border",
                  it.tone === "success" &&
                    "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
                  it.tone === "primary" && "bg-primary/10 border-primary/30 text-primary",
                  it.tone === "warn" && "bg-amber-500/10 border-amber-500/30 text-amber-400",
                  it.tone === "muted" && "bg-muted border-border text-muted-foreground",
                )}
              >
                <it.icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-sm font-medium">{it.title}</div>
                  <div className="text-[11px] text-muted-foreground shrink-0">
                    {formatDate(it.at)}
                  </div>
                </div>
                {it.body && (
                  <div className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap line-clamp-4">
                    {it.body}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Business info */}
      <section className="rounded-2xl border border-border/70 bg-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary font-medium">
              Business information
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {infoSubmitted
                ? "Details we're using to build your website."
                : "We haven't received your business info yet."}
            </div>
          </div>
          {!infoSubmitted && (
            <Button asChild size="sm" className="rounded-full">
              <Link to="/dashboard/updates">Submit business info</Link>
            </Button>
          )}
        </div>
        {infoSubmitted ? (
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <InfoItem label="Business name" value={info.business_name} />
            <InfoItem label="Contact person" value={info.contact_person} />
            <InfoItem label="Email" value={info.email} />
            <InfoItem label="Phone" value={info.phone} />
            <InfoItem label="Address" value={info.address} full />
            <InfoItem label="Services" value={info.services} full multiline />
            <InfoItem label="About" value={info.about} full multiline />
            <InfoItem label="Brand colors" value={info.brand_colors} />
            <InfoItem label="Existing domain" value={info.existing_domain} />
            <InfoItem label="Social links" value={info.social_links} full multiline />
            <InfoItem
              label="Requested changes"
              value={info.change_requests}
              full
              multiline
              highlight
            />
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
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Reach out to our team through Messages & Support so we can start building your site.
          </div>
        )}
      </section>
    </div>
  );
}

function SiteMessages({
  site,
  userId,
  messages,
  threadId,
}: {
  site: any;
  userId?: string;
  messages: SupportMessage[];
  threadId?: string;
}) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const send = useMutation({
    mutationFn: async () => {
      const text = body.trim();
      if (!userId || !text) return;
      const { data, error } = await supabase.from("support_messages").insert({
        user_id: userId,
        site_id: site.id,
        ...(threadId ? { thread_id: threadId } : {}),
        subject: `${site.site_name}`,
        body: text,
        from_admin: false,
      }).select("id").single();
      if (error) throw error;
      void emailAboutMessage("customer_message", data?.id);
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["site-support"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not send your message"),
  });

  return (
    <section id="messages" className="rounded-2xl border border-border/70 bg-card p-6 scroll-mt-24">
      <div className="text-xs uppercase tracking-widest text-primary font-medium">Messages</div>
      <div className="text-sm text-muted-foreground mt-1 mb-4">
        Talk to our team about this website.
      </div>

      <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No messages yet. Say hello or ask us anything below.
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={cn("flex", m.from_admin ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                  m.from_admin
                    ? "bg-muted rounded-bl-sm"
                    : "bg-primary text-primary-foreground rounded-br-sm",
                )}
              >
                <div className="whitespace-pre-wrap">{m.body}</div>
                <div
                  className={cn(
                    "mt-1 text-[10px]",
                    m.from_admin ? "text-muted-foreground" : "text-primary-foreground/70",
                  )}
                >
                  {m.from_admin ? "HooNext · " : ""}
                  {formatDate(m.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send.mutate();
            }
          }}
        />
        <Button
          onClick={() => send.mutate()}
          disabled={send.isPending || !body.trim()}
          className="self-end"
        >
          {send.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm border-b last:border-none pb-2 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function InfoItem({
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
          "mt-1 text-sm font-medium",
          multiline && "whitespace-pre-wrap font-normal",
          highlight && "rounded-lg border border-primary/30 bg-primary/5 p-3",
        )}
      >
        {value}
      </div>
    </div>
  );
}
