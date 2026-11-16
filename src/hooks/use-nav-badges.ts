import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Audience } from "@/hooks/use-notifications";
import { countByNavItem, normalizePath } from "@/lib/nav-badges";

// Safety cap on how many unread rows are fetched for counting.
const MAX_UNREAD_ROWS = 500;
// When someone opens the exact page a notification points to, its badge clears
// after they have been on that page this long (and the tab is visible).
const DWELL_MS = 1200;
// Set to false to never mark notifications read automatically.
const AUTO_MARK_READ = true;

interface UnreadRow {
  id: string;
  url: string | null;
}

/**
 * Unread-notification counts for the dashboard sidebar.
 *
 * Each unread notification is matched to a sidebar item by its `url`
 * ("/admin/messages" -> "Support Messages", "/dashboard/websites/<id>" ->
 * "My Websites"). The Notifications item shows the total. The query key starts
 * with "notifications", so RealtimeSync and the bell's mutations refresh it
 * automatically; the slow poll is only a safety net.
 */
export function useNavBadges(opts: {
  audience: Audience;
  navPaths: readonly string[];
  homePath: string;
  notificationsPath: string;
  pathname: string;
}) {
  const { audience, navPaths, homePath, notificationsPath, pathname } = opts;
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: rows = [] } = useQuery({
    queryKey: ["notifications", "nav-unread", audience, user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      let q = supabase
        .from("notifications")
        .select("id,url")
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(MAX_UNREAD_ROWS);
      q = audience === "admin" ? q.eq("audience", "admin") : q.eq("user_id", user!.id);
      const { data, error } = await q;
      if (error) throw error; // react-query keeps the previous counts on failure
      return (data ?? []) as UnreadRow[];
    },
  });

  const navKey = navPaths.join("|");
  const counts = useMemo(
    () => countByNavItem(rows, navPaths, homePath, notificationsPath),
    // navKey stands in for the navPaths array identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, navKey, homePath, notificationsPath],
  );

  // Opening the exact page a notification points to counts as reading it.
  const attempted = useRef(new Set<string>()); // never retry the same ids in a loop
  useEffect(() => {
    if (!AUTO_MARK_READ || !user) return;
    const here = normalizePath(pathname);
    if (!here || here === notificationsPath) return; // that page has its own "mark all read"

    const ids = rows
      .filter((r) => normalizePath(r.url) === here && !attempted.current.has(r.id))
      .map((r) => r.id);
    if (ids.length === 0) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      timer = undefined;
      ids.forEach((id) => attempted.current.add(id));
      try {
        const { error } = await supabase
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .in("id", ids);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["notifications"] });
      } catch (e) {
        console.error("[notifications] could not mark page notifications read (non-fatal)", e);
      }
    };
    const arm = () => {
      if (timer === undefined && document.visibilityState === "visible") {
        timer = setTimeout(run, DWELL_MS);
      }
    };
    const disarm = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    };
    const onVisibility = () => (document.visibilityState === "visible" ? arm() : disarm());

    document.addEventListener("visibilitychange", onVisibility);
    arm();
    return () => {
      disarm();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [rows, pathname, notificationsPath, user, qc]);

  return { counts, total: rows.length };
}