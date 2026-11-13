import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/admin/settings")({ component: AdminSettings });
function AdminSettings() {
  return (
    <div className="max-w-2xl space-y-6">
      <div><h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Marketplace configuration.</p></div>
      <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        Marketplace settings coming soon.
      </div>
    </div>
  );
}
