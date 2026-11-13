import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/marketplace/site-header";
import { SiteFooter } from "@/components/marketplace/site-footer";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/refund-policy")({
  component: RefundPolicyPage,
  head: () =>
    seo({
      title: "Refund Policy — HooNext",
      description:
        "Refund Policy for HooNext website purchases, subscriptions, maintenance plans, and custom development services.",
      path: "/refund-policy",
    }),
});

function RefundPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <article className="container-page max-w-3xl py-16 md:py-20">
          <div className="text-xs uppercase tracking-widest text-primary font-medium">Legal</div>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">Refund Policy</h1>

          <p className="mt-3 text-sm text-muted-foreground">Last updated: July 2026</p>

          <div className="mt-10 space-y-10 text-sm leading-7 text-muted-foreground">
            <section>
              <h2 className="text-lg font-semibold text-foreground">1. Free Website Preview</h2>

              <p className="mt-2">
                HooNext allows you to preview your website before purchasing. Since no payment is
                required for the preview experience, no refund applies at this stage.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">2. Website Purchases</h2>

              <p className="mt-2">
                Once payment is successfully completed, HooNext immediately begins provisioning your
                website, allocating infrastructure, generating your project, and preparing your
                customer dashboard. Because our products are delivered digitally and provisioning
                starts immediately, purchases become non-refundable once this process has begun.
              </p>

              <p className="mt-2">
                If you are charged more than once for the same purchase or a billing error occurs,
                please contact us immediately. Verified duplicate or incorrect charges will be
                refunded.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">
                3. Monthly Subscription Plans
              </h2>

              <p className="mt-2">
                Subscription plans may be cancelled at any time from your dashboard. Cancellation
                prevents future renewals but does not refund payments already made for the current
                billing period. Your website and included services remain active until the end of
                your current subscription cycle.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">4. Buy &amp; Maintain Plan</h2>

              <p className="mt-2">
                Customers enrolled in the Buy &amp; Maintain plan may cancel the monthly maintenance
                subscription before the next billing cycle. Maintenance services continue until the
                current billing period expires.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">5. Custom Development</h2>

              <p className="mt-2">
                Any custom development, integrations, migrations, consulting, or additional work
                requested outside HooNext's standard website offerings is non-refundable once
                development has started.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">
                6. Domains &amp; Third-Party Services
              </h2>

              <p className="mt-2">
                Domain registrations, premium themes, plugins, software licenses, hosting, email
                services, and any other third-party products or services purchased on your behalf
                are non-refundable once purchased.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">7. Refund Requests</h2>

              <p className="mt-2">
                If you believe you have been billed incorrectly or have another payment concern,
                please contact us at <strong>support@hoonext.online</strong>.
              </p>

              <p className="mt-2">
                We aim to respond within five (5) business days. Approved refunds are issued to the
                original payment method and typically appear within five (5) to ten (10) business
                days depending on your payment provider.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">8. Chargebacks</h2>

              <p className="mt-2">
                Before initiating a chargeback with your bank or card provider, please contact
                HooNext so we can resolve the issue directly. Active chargebacks may result in
                temporary suspension of your website or services while the dispute is under review.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">9. Changes to this Policy</h2>

              <p className="mt-2">
                HooNext may update this Refund Policy from time to time. Any changes become
                effective immediately after being published on this page. Continued use of our
                services after updates indicates acceptance of the revised policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">10. Contact Us</h2>

              <p className="mt-2">
                If you have any questions regarding this Refund Policy, please contact us at{" "}
                <strong>support@hoonext.online</strong>.
              </p>
            </section>
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
