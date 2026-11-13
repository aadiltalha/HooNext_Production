import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/marketplace/site-header";
import { SiteFooter } from "@/components/marketplace/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageLoader } from "@/components/shared/page-loader";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Upload, Sparkles, ShieldCheck, CheckCircle2 } from "lucide-react";
import {
  ContactVerification,
  useContactVerified,
} from "@/components/checkout/contact-verification";
import { syncContactVerification } from "@/lib/contact/server";
import { warmCheckout } from "@/lib/razorpay/server";
import { ONBOARDING_KEY, type OnboardingData } from "@/lib/onboarding";
import { noindexHead } from "@/lib/seo";

export const Route = createFileRoute("/customize/$slug")({
  component: CustomizePage,
  head: () => noindexHead("Customize your website — HooNext"),
});

function CustomizePage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { verified, emailOk, phoneOk } = useContactVerified();
  const verifySectionRef = useRef<HTMLDivElement>(null);
  const syncedFor = useRef<string | null>(null);

  // Quietly prepare the payment server while the customer fills in the form.
  useEffect(() => {
    if (user) void warmCheckout().catch(() => undefined);
  }, [user?.id]);

  const { data: template, isLoading } = useQuery({
    queryKey: ["template", slug],
    queryFn: async () =>
      (
        await supabase
          .from("templates")
          .select("name,slug,thumbnail_url")
          .eq("slug", slug)
          .maybeSingle()
      ).data,
  });

  const [form, setForm] = useState<OnboardingData>({
    business_name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    services: "",
    about: "",
    gallery_urls: "",
    brand_colors: "",
    social_links: "",
    existing_domain: "",
    change_requests: "",
    submitted_at: "",
  });
  const [logoPreview, setLogoPreview] = useState<string | undefined>();

  useEffect(() => {
    if (!user && !isLoading)
      navigate({ to: "/auth", search: { redirect: `/customize/${slug}` } as any });
  }, [user, isLoading, navigate, slug]);

  useEffect(() => {
    // Prefill from any saved draft or profile
    try {
      const saved = sessionStorage.getItem(ONBOARDING_KEY(slug));
      if (saved) {
        const parsed = JSON.parse(saved) as OnboardingData;
        setForm(parsed);
        if (parsed.logo_data_url) setLogoPreview(parsed.logo_data_url);
        return;
      }
    } catch {}
    if (profile) {
      setForm((f) => ({
        ...f,
        contact_person: f.contact_person || profile.full_name || "",
        email: f.email || profile.email || "",
      }));
    }
  }, [slug, profile]);

  // Once verified, have the server record it in the database (it re-reads the
  // truth from Supabase Auth, so this can't be faked from the browser).
  useEffect(() => {
    if (!verified || !user || syncedFor.current === user.id) return;
    syncedFor.current = user.id;
    syncContactVerification().catch((e) => console.error("[verification] sync failed", e));
  }, [verified, user]);

  // Use the verified number as the business phone by default.
  useEffect(() => {
    if (user?.phone_confirmed_at && user.phone) {
      setForm((f) => (f.phone ? f : { ...f, phone: `+${user.phone!.replace(/^\+/, "")}` }));
    }
  }, [user?.phone_confirmed_at, user?.phone]);

  const set = <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleLogo = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 800 * 1024) {
      toast.error("Logo must be under 800KB — please upload a smaller image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      set("logo_data_url", url);
      setLogoPreview(url);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verified) {
      toast.error(
        !emailOk
          ? "Please verify your email address first."
          : "Please verify your phone number first.",
      );
      verifySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!form.business_name.trim()) return toast.error("Business name is required");
    if (!form.email.trim()) return toast.error("Email is required");
    const payload: OnboardingData = { ...form, submitted_at: new Date().toISOString() };
    try {
      sessionStorage.setItem(ONBOARDING_KEY(slug), JSON.stringify(payload));
    } catch {
      toast.error("Couldn't save your info — try smaller image uploads.");
      return;
    }
    navigate({ to: "/review/$slug", params: { slug } });
  };

  if (isLoading || !template) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <PageLoader message="Loading your template" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-10 md:py-14">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/marketplace/$slug"
            params={{ slug }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to template
          </Link>

          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Step 1 of 2 — tell us about your
            business
          </div>

          <div className="mt-4 flex items-start gap-4">
            <div className="h-16 w-24 rounded-lg overflow-hidden bg-muted shrink-0 hidden sm:block">
              {template.thumbnail_url && (
                <img src={template.thumbnail_url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Customize your website
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Your website will be a professionally customized version of{" "}
                <span className="text-foreground font-medium">{template.name}</span> — not the exact
                demo. Share the details below and we'll build it around your brand.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-8">
            <div ref={verifySectionRef} className="scroll-mt-24">
              {verified ? (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    Contact details verified
                    <span className="text-muted-foreground">
                      {" "}
                      — {user?.email}
                      {phoneOk && user?.phone ? ` · +${user.phone.replace(/^\+/, "")}` : ""}
                    </span>
                  </span>
                </div>
              ) : (
                <Section
                  title="Verify your contact details"
                  subtitle="Required so our team can reach you while we build your site."
                >
                  <ContactVerification defaultPhone={form.phone} />
                </Section>
              )}
            </div>

            <Section title="Business basics">
              <Grid>
                <Field label="Business name *">
                  <Input
                    value={form.business_name}
                    onChange={(e) => set("business_name", e.target.value)}
                    required
                  />
                </Field>
                <Field label="Contact person">
                  <Input
                    value={form.contact_person}
                    onChange={(e) => set("contact_person", e.target.value)}
                  />
                </Field>
                <Field label="Email *">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    required
                  />
                </Field>
                <Field label="Phone">
                  <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </Field>
                <Field label="Business address" full>
                  <Input
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="Street, city, state, ZIP"
                  />
                </Field>
              </Grid>
            </Section>

            <Section title="Your services & story">
              <Grid>
                <Field label="Services offered" full>
                  <Textarea
                    rows={3}
                    value={form.services}
                    onChange={(e) => set("services", e.target.value)}
                    placeholder="e.g. Roof repair, gutter cleaning, storm damage restoration"
                  />
                </Field>
                <Field label="About your business" full>
                  <Textarea
                    rows={4}
                    value={form.about}
                    onChange={(e) => set("about", e.target.value)}
                    placeholder="A short paragraph we can use on your homepage / About page."
                  />
                </Field>
              </Grid>
            </Section>

            <Section title="Branding & media">
              <Grid>
                <Field label="Logo upload" full>
                  <label className="flex items-center gap-3 rounded-xl border border-dashed border-border/70 bg-card/40 p-4 cursor-pointer hover:border-primary/40 transition-colors">
                    <Upload className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {logoPreview
                        ? "Replace logo (PNG / JPG / SVG, up to 800KB)"
                        : "Upload logo (PNG / JPG / SVG, up to 800KB)"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleLogo(e.target.files?.[0])}
                    />
                    {logoPreview && (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="ml-auto h-10 w-10 rounded object-contain bg-white"
                      />
                    )}
                  </label>
                </Field>
                <Field label="Gallery images (optional)" full>
                  <Textarea
                    rows={2}
                    value={form.gallery_urls}
                    onChange={(e) => set("gallery_urls", e.target.value)}
                    placeholder="Paste image URLs, one per line — or leave blank and email us later."
                  />
                </Field>
                <Field label="Brand colors">
                  <Input
                    value={form.brand_colors}
                    onChange={(e) => set("brand_colors", e.target.value)}
                    placeholder="e.g. #0F62FE, navy, warm gold"
                  />
                </Field>
                <Field label="Existing domain (optional)">
                  <Input
                    value={form.existing_domain}
                    onChange={(e) => set("existing_domain", e.target.value)}
                    placeholder="example.com"
                  />
                </Field>
                <Field label="Social links" full>
                  <Textarea
                    rows={2}
                    value={form.social_links}
                    onChange={(e) => set("social_links", e.target.value)}
                    placeholder="Instagram, Facebook, LinkedIn, YouTube — one per line"
                  />
                </Field>
              </Grid>
            </Section>

            <Section
              title="Tell us what you'd like changed"
              subtitle="This is the most important part. The more detail, the better."
            >
              <Textarea
                rows={7}
                value={form.change_requests}
                onChange={(e) => set("change_requests", e.target.value)}
                placeholder={`Examples:\n• Change primary color to deep green\n• Replace hero image with our team photo\n• Add a "Financing" section under Services\n• Remove the blog section\n• Add a WhatsApp chat button\n• Anything else you'd like different from the demo`}
              />
            </Section>

            <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-5 flex items-start gap-3 text-sm text-muted-foreground">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                Your details are saved with your order so our team can build a website tailored to
                your business. You'll get{" "}
                <span className="text-foreground font-medium">2 free revision rounds</span> before
                launch.
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/marketplace/$slug", params: { slug } })}
              >
                Back
              </Button>
              <Button
                type="submit"
                size="lg"
                className="rounded-full h-12 px-6 btn-gradient border-0"
              >
                Continue to review <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-6">
      <div className="mb-4">
        <div className="text-xs uppercase tracking-widest text-primary font-medium">{title}</div>
        {subtitle && <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>}
      </div>
      {children}
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}
function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}