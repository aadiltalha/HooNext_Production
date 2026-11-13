import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/marketplace/site-header";
import { SiteFooter } from "@/components/marketplace/site-footer";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  component: Terms,
  head: () =>
    seo({
      title: "Terms & Conditions — HooNext",
      description:
        "Read the Terms & Conditions governing the use of HooNext and its website marketplace services.",
      path: "/terms",
    }),
});

function Terms() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="container-page py-20 max-w-5xl">
          <div className="mb-14">
            <div className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Legal</div>

            <h1 className="mt-4 text-5xl font-bold tracking-tight">Terms & Conditions</h1>

            <p className="mt-6 text-lg text-muted-foreground leading-8 max-w-3xl">
              These Terms & Conditions govern your access to and use of the HooNext platform,
              products, and services. By using HooNext, you agree to comply with these terms.
            </p>

            <p className="mt-4 text-sm text-muted-foreground">Last updated: July 2026</p>
          </div>

          <div className="space-y-10">
            <Section
              title="1. About HooNext"
              text="HooNext provides professionally designed business website templates and website launch services for local businesses. We offer digital products, optional maintenance plans, and subscription-based services."
            />

            <Section
              title="2. Eligibility"
              text="You must be at least 18 years old and legally capable of entering into binding agreements to purchase products or services from HooNext."
            />

            <Section
              title="3. Orders & Payments"
              text="All purchases must be completed through our approved payment providers. Prices are displayed before checkout and may change without prior notice. Orders become effective only after successful payment confirmation."
            />

            <Section
              title="4. Digital Products"
              text="Website templates are digital products. Once work has begun or digital assets have been delivered, refunds may not be available except where required by applicable law."
            />

            <Section
              title="5. Customer Responsibilities"
              text="Customers are responsible for providing accurate business information, logos, images, text content, and any required materials needed to complete their website."
            />

            <Section
              title="6. Maintenance Plans"
              text="Maintenance subscriptions include the services described in the selected plan. Requests beyond the scope of the purchased plan may require additional fees."
            />

            <Section
              title="7. Intellectual Property"
              text="All website templates, branding, graphics, code, and platform content remain the intellectual property of HooNext unless explicitly transferred under a separate written agreement."
            />

            <Section
              title="8. Acceptable Use"
              text="You may not use HooNext to publish illegal, fraudulent, abusive, harmful, or infringing content. We reserve the right to suspend or terminate services for violations of these terms."
            />

            <Section
              title="9. Service Availability"
              text="While we strive for maximum uptime, HooNext does not guarantee uninterrupted availability. Scheduled maintenance or unexpected outages may temporarily affect services."
            />

            <Section
              title="10. Limitation of Liability"
              text="To the maximum extent permitted by law, HooNext shall not be liable for indirect, incidental, consequential, or special damages arising from the use of our platform or services."
            />

            <Section
              title="11. Changes to These Terms"
              text="We may update these Terms & Conditions periodically. Continued use of HooNext after changes become effective constitutes acceptance of the updated terms."
            />

            <Section
              title="12. Contact"
              text="For questions regarding these Terms & Conditions, please contact HooNext through our official support channels."
            />
          </div>

          <div className="mt-20 rounded-3xl border border-border bg-card p-8 text-center">
            <h2 className="text-2xl font-semibold">Questions about our Terms?</h2>

            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              If you have any questions regarding these Terms & Conditions, please contact our
              support team before purchasing any product or subscription.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <section className="border-b border-border pb-8">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>

      <p className="mt-4 text-muted-foreground leading-8">{text}</p>
    </section>
  );
}
