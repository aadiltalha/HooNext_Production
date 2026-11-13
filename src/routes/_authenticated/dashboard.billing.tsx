import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/dashboard/billing")({ component: Billing });
function Billing() {
  return (
    <div className="max-w-3xl space-y-6">
      <div><h2 className="text-2xl font-bold tracking-tight">Billing</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your payment methods and invoices.</p></div>
      <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground text-sm">
        Payment method management coming soon.
      </div>
    </div>
  );
}
