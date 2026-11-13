import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Audience, NotificationRow } from "@/hooks/use-notifications";
import { playChime, showDesktopNotification, soundEnabled } from "@/lib/notification-prefs";

// Which cached queries to refresh when each table changes.
const KEYS_BY_TABLE: Record<string, string[]> = {
  support_messages: [
    "support-messages",
    "admin-messages",
    "site-support",
    "overview",
    "admin-stats",
  ],
  request_messages: ["request-messages", "site-request-messages", "admin-customer-profile"],
  site_update_requests: [
    "update-requests",
    "admin-requests",
    "admin-pending-requests",
    "site-requests",
    "overview",
    "admin-stats",
  ],
  customer_sites: [
    "site",
    "sites",
    "sites-min",
    "sites-count",
    "admin-sites-pipeline",
    "admin-orders",
    "overview",
    "admin-stats",
  ],
};
const NOTIFICATION_KEYS = ["notifications", "notifications-page", "site-notifications"];

/**
 * One live connection to Supabase Realtime for the whole dashboard. It
 *  - pops a toast (+ optional sound, + optional desktop alert when the tab is
 *    in the background) the moment a notification arrives, and
 *  - refreshes chats, requests and statuses instantly.
 * Renders nothing. If Realtime is unavailable the pages' slow polling still
 * keeps everything up to date.
 */
export function RealtimeSync({ audience }: { audience: Audience }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  // Keep the latest navigate without re-subscribing on every render.
  const go = useRef<(url: string | null) => void>(() => undefined);
  go.current = (url) => {
    if (url) navigate({ to: url as any });
  };
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!user) return;

    const refresh = (keys: string[]) =>
      qc.invalidateQueries({
        predicate: (q) =>
          typeof q.queryKey[0] === "string" && keys.includes(q.queryKey[0] as string),
      });

    const onNotification = (payload: { new: NotificationRow }) => {
      const n = payload.new;
      if (!n?.id || seen.current.has(n.id)) return; // user + admin filters can both match
      seen.current.add(n.id);
      refresh(NOTIFICATION_KEYS);

      toast(n.title, {
        description: n.body ?? undefined,
        duration: 8000,
        action: n.url ? { label: "View", onClick: () => go.current(n.url) } : undefined,
      });
      if (soundEnabled()) playChime();
      showDesktopNotification(n, (url) => go.current(url));
    };

    const channel = supabase.channel(`live-${audience}-${user.id}`);
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      },
      onNotification as any,
    );
    if (audience === "admin") {
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: "audience=eq.admin" },
        onNotification as any,
      );
    }
    for (const [table, keys] of Object.entries(KEYS_BY_TABLE)) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => refresh(keys));
    }
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, audience, qc]);

  return null;
}
