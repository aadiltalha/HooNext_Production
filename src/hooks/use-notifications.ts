import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  type: string | null;
  read_at: string | null;
  created_at: string;
}

export type Audience = "user" | "admin";

/**
 * The bell's data. Realtime (see RealtimeSync) refreshes it instantly; the slow
 * poll is only a safety net for dropped connections.
 */
export function useNotifications(audience: Audience) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const key = ["notifications", audience, user?.id];

  const { data: items = [] } = useQuery({
    queryKey: key,
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      let q = supabase
        .from("notifications")
        .select("id,title,body,url,type,read_at,created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      q = audience === "admin" ? q.eq("audience", "admin") : q.eq("user_id", user!.id);
      return ((await q).data ?? []) as NotificationRow[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["notifications"] });

  const markAll = useMutation({
    mutationFn: async () => {
      const ids = items.filter((n) => !n.read_at).map((n) => n.id);
      if (!ids.length) return;
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids);
    },
    onSuccess: refresh,
  });

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
    },
    onSuccess: refresh,
  });

  return { items, unread: items.filter((n) => !n.read_at).length, markAll, markOne };
}
