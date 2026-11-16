// Pure helpers that decide which sidebar item an unread notification belongs to.
// No imports on purpose: easy to reason about and to unit-test.

/** Turns a notification url ("/admin/messages?x=1", "https://site/x/") into a clean path, or null. */
export function normalizePath(url: string | null | undefined): string | null {
  if (!url) return null;
  let p = url.trim();
  if (/^https?:\/\//i.test(p)) {
    try {
      p = new URL(p).pathname;
    } catch {
      return null;
    }
  }
  p = p.split(/[?#]/)[0];
  if (!p.startsWith("/")) return null;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
}

/**
 * Finds the sidebar item a path belongs to: the item with the longest `to` that
 * equals the path or is a parent of it ("/dashboard/websites/abc" belongs to
 * "/dashboard/websites"). The home item ("/dashboard", "/admin") only matches
 * itself, otherwise every page would count towards it.
 */
export function matchNavTarget(
  path: string | null,
  navPaths: readonly string[],
  homePath: string,
): string | null {
  if (!path) return null;
  let best: string | null = null;
  for (const to of navPaths) {
    const hit = path === to || (to !== homePath && path.startsWith(to + "/"));
    if (hit && (best === null || to.length > best.length)) best = to;
  }
  return best;
}

/** Counts unread notifications per sidebar item. */
export function countByNavItem(
  rows: ReadonlyArray<{ url: string | null }>,
  navPaths: readonly string[],
  homePath: string,
  notificationsPath: string,
): Record<string, number> {
  // The Notifications page itself shows the grand total, so it is not a target.
  const targets = navPaths.filter((p) => p !== notificationsPath);
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const target = matchNavTarget(normalizePath(row.url), targets, homePath);
    if (target) counts[target] = (counts[target] ?? 0) + 1;
  }
  if (rows.length > 0) counts[notificationsPath] = rows.length;
  return counts;
}