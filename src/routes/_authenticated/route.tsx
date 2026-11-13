import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireSession } from "@/lib/auth-guard";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    await requireSession(location.href);
  },
  // Private pages must never be indexed.
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: () => <Outlet />,
});
