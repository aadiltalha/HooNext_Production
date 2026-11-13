import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/marketplace/site-header";
import { SiteFooter } from "@/components/marketplace/site-footer";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/cookie-policy")({
  component: CookiePolicyPage,
  head: () =>
    seo({
      title: "Cookie Policy — HooNext",
      description:
        "Learn how HooNext uses cookies and similar technologies to improve your browsing experience, keep your account secure, and process payments.",
      path: "/cookie-policy",
    }),
});

function CookiePolicyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <article className="container-page max-w-3xl py-16 md:py-20">
          <div className="text-xs uppercase tracking-widest text-primary font-medium">Legal</div>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">Cookie Policy</h1>

          <p className="mt-3 text-sm text-muted-foreground">Last updated: July 2026</p>

          <div className="mt-10 space-y-10 text-sm leading-7 text-muted-foreground">
            <section>
              <h2 className="text-lg font-semibold text-foreground">1. What Are Cookies?</h2>

              <p className="mt-2">
                Cookies are small text files stored on your device when you visit a website. They
                help websites remember your preferences, keep you signed in, improve performance,
                and provide a more secure browsing experience.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">2. How HooNext Uses Cookies</h2>

              <p className="mt-2">
                HooNext uses cookies and similar technologies to operate our marketplace, customer
                dashboard, website builder, and payment system. These technologies help us
                authenticate users, protect accounts, process purchases securely, and improve the
                overall performance of our platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">3. Types of Cookies We Use</h2>

              <div className="mt-5 overflow-x-auto rounded-xl border border-border">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Purpose</th>
                      <th className="px-4 py-3 font-medium">Provider</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr className="border-t">
                      <td className="px-4 py-4 font-medium text-foreground">Essential Cookies</td>
                      <td className="px-4 py-4">
                        Required for login, authentication, security, website functionality, and
                        customer dashboards.
                      </td>
                      <td className="px-4 py-4">HooNext / Supabase</td>
                    </tr>

                    <tr className="border-t">
                      <td className="px-4 py-4 font-medium text-foreground">Payment Cookies</td>
                      <td className="px-4 py-4">
                        Securely process payments and prevent fraud during checkout.
                      </td>
                      <td className="px-4 py-4">Paddle</td>
                    </tr>

                    <tr className="border-t">
                      <td className="px-4 py-4 font-medium text-foreground">Preference Cookies</td>
                      <td className="px-4 py-4">
                        Remember user preferences such as interface settings and improve your
                        browsing experience.
                      </td>
                      <td className="px-4 py-4">HooNext</td>
                    </tr>

                    <tr className="border-t">
                      <td className="px-4 py-4 font-medium text-foreground">Performance Cookies</td>
                      <td className="px-4 py-4">
                        Help us monitor application performance and improve reliability.
                      </td>
                      <td className="px-4 py-4">HooNext</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">4. Third-Party Services</h2>

              <p className="mt-2">
                HooNext works with trusted third-party providers, including Paddle for payment
                processing and Supabase for authentication and database services. These providers
                may place cookies necessary to deliver their services securely and reliably.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">5. Managing Cookies</h2>

              <p className="mt-2">
                Most web browsers allow you to control cookies through their settings. You may
                choose to block or delete cookies at any time. However, disabling essential cookies
                may prevent parts of the HooNext platform from functioning correctly, including
                logging in, making purchases, and accessing your dashboard.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">6. Your Choices</h2>

              <p className="mt-2">
                You may configure your browser to notify you when cookies are being used or refuse
                certain cookies. Please note that some features of HooNext may become unavailable if
                essential cookies are disabled.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">7. Changes to This Policy</h2>

              <p className="mt-2">
                We may update this Cookie Policy from time to time to reflect changes in our
                services, technologies, or legal requirements. Any updates will be published on this
                page with a revised "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">8. Contact Us</h2>

              <p className="mt-2">
                If you have any questions regarding our use of cookies or this Cookie Policy, please
                contact us at <strong>support@hoonext.online</strong>.
              </p>
            </section>
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
