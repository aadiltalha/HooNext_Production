import { createFileRoute } from "@tanstack/react-router";
import { NotificationsView } from "./dashboard.notifications";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  component: () => <NotificationsView audience="admin" />,
});
