import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashShell } from "@/components/dashboard/dash-shell";
import { LayoutDashboard, Globe, Receipt, CreditCard, Repeat, Settings, Wrench, MessageSquare, Bell } from "lucide-react";

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/websites", label: "My Websites", icon: Globe },
  { to: "/dashboard/updates", label: "Update Requests", icon: Wrench },
  { to: "/dashboard/support", label: "Messages & Support", icon: MessageSquare },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { to: "/dashboard/orders", label: "Orders", icon: Receipt },
  { to: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { to: "/dashboard/subscription", label: "Subscription", icon: Repeat },
  { to: "/dashboard/settings", label: "Account Settings", icon: Settings },
];

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: () => (
    <DashShell title="Client Dashboard" nav={nav} brandHref="/dashboard" brandLabel="Client Dashboard">
      <Outlet />
    </DashShell>
  ),
});
