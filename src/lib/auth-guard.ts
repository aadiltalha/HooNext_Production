import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Route guards are only a UX convenience (bounce signed-out visitors to the
// sign-in page). Real protection is row-level security in the database, which
// is enforced on every request regardless of what the browser does.
//
// They deliberately use getSession(), which reads the locally stored session,
// instead of getUser(), which makes a NETWORK round trip to Supabase. With
// getUser() every single page change waited on that request before rendering,
// which is a big part of why the dashboard felt slow.

export async function requireSession(redirectTo?: string) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw redirect({
      to: "/auth",
      search: redirectTo ? ({ redirect: redirectTo } as any) : undefined,
    });
  }
  return data.session;
}

// Admin status is looked up once per sign-in (not once per navigation).
const ADMIN_TTL_MS = 5 * 60_000;
const adminCache = new Map<string, { at: number; value: Promise<boolean> }>();

supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") adminCache.clear();
});

function isAdmin(userId: string): Promise<boolean> {
  const hit = adminCache.get(userId);
  if (hit && Date.now() - hit.at < ADMIN_TTL_MS) return hit.value;
  const value = Promise.resolve(
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle(),
  )
    .then(({ data }) => Boolean(data))
    .catch(() => {
      adminCache.delete(userId); // don't cache failures
      return false;
    });
  adminCache.set(userId, { at: Date.now(), value });
  return value;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (!(await isAdmin(session.user.id))) throw redirect({ to: "/dashboard" });
}
