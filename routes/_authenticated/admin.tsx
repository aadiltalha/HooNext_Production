import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/auth-guard";
import { DashShell } from "@/components/dashboard/dash-shell";
import {
  LayoutDashboard,
  LayoutTemplate,
  Users,
  Receipt,
  Repeat,
  Settings,
  Wrench,
  MessageSquare,
  FileText,
  Bell,
  Mail,
} from "lucide-react";

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/templates", label: "Templates", icon: LayoutTemplate },
  { to: "/admin/blog", label: "Blog", icon: FileText },
  { to: "/admin/requests", label: "Update Requests", icon: Wrench },
  { to: "/admin/contacts", label: "Contact Messages", icon: Mail },
  { to: "/admin/messages", label: "Support Messages", icon: MessageSquare },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/orders", label: "Orders", icon: Receipt },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: Repeat },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    await requireAdmin();
  },
  component: () => (
    <DashShell title="Admin Dashboard" nav={nav} brandHref="/admin" brandLabel="Admin Dashboard">
      <Outlet />
    </DashShell>
  ),
});
