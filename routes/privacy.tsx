import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/marketplace/site-header";
import { SiteFooter } from "@/components/marketplace/site-footer";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  component: Privacy,
  head: () =>
    seo({
      title: "Privacy Policy — HooNext",
      description:
        "Learn how HooNext collects, uses, stores, and protects your personal information.",
      path: "/privacy",
    }),
});

function Privacy() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}

        <section className="container-page py-20 max-w-6xl">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm text-primary">
            Privacy & Security
          </div>

          <h1 className="mt-8 text-5xl md:text-6xl font-bold tracking-tight max-w-4xl">
            Your privacy is important to us.
          </h1>

          <p className="mt-8 text-lg leading-8 text-muted-foreground max-w-3xl">
            At HooNext, we believe trust begins with transparency. This Privacy Policy explains what
            information we collect, why we collect it, how we protect it, and the choices you have
            regarding your personal information.
          </p>

          <div className="mt-6 text-sm text-muted-foreground">Last updated: July 2026</div>
        </section>

        {/* Content */}

        <section className="container-page pb-24 max-w-6xl">
          <div className="grid gap-6">
            <PolicyCard
              title="Information We Collect"
              text="We may collect personal information such as your name, email address, business information, billing details, project requirements, uploaded content, and communications with our support team."
            />

            <PolicyCard
              title="How We Use Your Information"
              text="We use your information to provide our services, process payments, build and manage your website, respond to support requests, improve our platform, and communicate important account updates."
            />

            <PolicyCard
              title="Payments"
              text="Payments are securely processed through trusted third-party payment providers. HooNext does not store your complete payment card details on our servers."
            />

            <PolicyCard
              title="Website Content"
              text="Any logos, images, text, branding assets, or files you upload remain your property. They are used solely to deliver the services you purchase."
            />

            <PolicyCard
              title="Cookies & Analytics"
              text="We may use cookies and analytics tools to improve performance, understand visitor behavior, remember preferences, and enhance your overall experience."
            />

            <PolicyCard
              title="How We Protect Your Data"
              text="We implement industry-standard security measures including encrypted connections, secure authentication, role-based access controls, and trusted infrastructure providers to safeguard your information."
            />

            <PolicyCard
              title="Information Sharing"
              text="We do not sell your personal information. We only share data with carefully selected service providers when necessary to deliver our services, process payments, or comply with legal obligations."
            />

            <PolicyCard
              title="Data Retention"
              text="We retain information only for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements."
            />

            <PolicyCard
              title="Your Rights"
              text="Depending on your location, you may have the right to access, update, correct, export, or request deletion of your personal information. Contact us if you'd like to exercise these rights."
            />

            <PolicyCard
              title="Third-Party Services"
              text="HooNext integrates with trusted providers such as Supabase, Paddle, Resend, and hosting platforms. Their respective privacy policies also apply to the services they provide."
            />

            <PolicyCard
              title="Policy Updates"
              text="We may update this Privacy Policy periodically to reflect improvements, legal requirements, or changes to our services. Continued use of HooNext after updates constitutes acceptance of the revised policy."
            />
          </div>

          {/* Bottom CTA */}

          <div className="mt-20 rounded-3xl border border-border bg-card/70 backdrop-blur-sm p-10 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <div className="w-6 h-6 rounded-full bg-primary" />
            </div>

            <h2 className="text-3xl font-bold">We believe privacy builds trust.</h2>

            <p className="mt-5 max-w-3xl mx-auto text-muted-foreground leading-8">
              Our goal is simple: collect only the information necessary to provide an excellent
              experience while keeping your data secure, transparent, and under your control.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Badge text="Secure Payments" />
              <Badge text="Encrypted Connections" />
              <Badge text="Privacy Focused" />
              <Badge text="No Data Selling" />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function PolicyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card/60 backdrop-blur-sm p-8 transition-all duration-300 hover:border-primary/40 hover:-translate-y-1">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>

      <p className="mt-4 text-muted-foreground leading-8">{text}</p>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <div className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium">
      {text}
    </div>
  );
}
