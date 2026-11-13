import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/marketplace/site-header";
import { SiteFooter } from "@/components/marketplace/site-footer";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  component: About,
  head: () =>
    seo({
      title: "About — HooNext",
      description:
        "Learn how HooNext helps local businesses launch premium websites without agencies, freelancers, or complicated website builders.",
      path: "/about",
    }),
});

function About() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="container-page py-24 text-center">
          <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm text-primary">
            About HooNext
          </div>

          <h1 className="mt-8 text-5xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto">
            Professional websites shouldn't take months, cost thousands, or require an agency.
          </h1>

          <p className="mt-8 max-w-3xl mx-auto text-lg text-muted-foreground leading-8">
            HooNext is a premium marketplace where local businesses can purchase professionally
            designed websites that are ready to launch. We take care of hosting, maintenance,
            security and updates, so business owners can focus on running their business.
          </p>
        </section>

        {/* Story */}

        <section className="container-page py-16">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold">Why we built HooNext</h2>

              <p className="mt-6 text-muted-foreground leading-8">
                Too many local businesses are forced to choose between expensive agencies, confusing
                website builders, or outdated templates that don't convert customers.
              </p>

              <p className="mt-6 text-muted-foreground leading-8">
                We believe getting online should be as simple as choosing a design that fits your
                business and letting professionals handle everything else.
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-card p-8">
              <div className="space-y-8">
                <Item
                  title="Choose"
                  text="Browse premium websites built specifically for your industry."
                />

                <Item title="Customize" text="Send us your logo, content and business details." />

                <Item
                  title="Launch"
                  text="We handle setup, hosting, deployment and ongoing maintenance."
                />
              </div>
            </div>
          </div>
        </section>

        {/* Values */}

        <section className="container-page py-16">
          <div className="text-center">
            <h2 className="text-4xl font-bold">What makes HooNext different</h2>

            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Every decision we make is focused on helping local businesses launch faster without
              compromising quality.
            </p>
          </div>

          <div className="mt-14 grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            <ValueCard
              title="Built for Local Businesses"
              text="Purpose-built templates designed for real service businesses."
            />

            <ValueCard
              title="Premium Design"
              text="Modern layouts that inspire trust and help convert visitors into customers."
            />

            <ValueCard
              title="Managed for You"
              text="Hosting, security, maintenance and updates handled by us."
            />

            <ValueCard
              title="Launch Faster"
              text="Skip months of development and launch in days instead."
            />
          </div>
        </section>

        {/* Mission */}

        <section className="container-page py-20">
          <div className="rounded-3xl border border-border bg-card p-12 text-center">
            <h2 className="text-4xl font-bold">Our Mission</h2>

            <p className="mt-6 max-w-3xl mx-auto text-lg text-muted-foreground leading-8">
              To make premium websites accessible to every local business by removing unnecessary
              complexity, reducing costs, and delivering beautiful websites that help businesses
              grow online.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function ValueCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:-translate-y-1">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-3 text-sm text-muted-foreground leading-7">{text}</p>
    </div>
  );
}

function Item({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <div className="text-lg font-semibold">{title}</div>
      <p className="mt-2 text-muted-foreground leading-7">{text}</p>
    </div>
  );
}
