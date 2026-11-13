import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Thin progress bar at the very top of the screen while a page is loading.
 * It only appears if navigation takes longer than ~120ms, so fast page changes
 * stay perfectly clean, but slow ones never feel frozen.
 */
export function RouteProgress() {
  const loading = useRouterState({ select: (s) => s.isLoading || s.status === "pending" });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => setVisible(true), 120);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisible(false), 250);
    return () => clearTimeout(t);
  }, [loading]);

  return (
    <div
      role="progressbar"
      aria-hidden={!visible}
      aria-busy={loading}
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms ease" }}
    >
      <div className="route-progress-bar h-full w-1/3 bg-[linear-gradient(90deg,var(--brand-cyan),var(--brand-violet))]" />
    </div>
  );
}
