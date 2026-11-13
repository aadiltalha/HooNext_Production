import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/marketplace/site-header";
import { SiteFooter } from "@/components/marketplace/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, Clock, LifeBuoy, MessageCircle } from "lucide-react";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/support")({
  component: SupportPage,
  head: () =>
    seo({
      title: "Support — HooNext",
      description:
        "Get help with your HooNext website — billing questions, technical issues, or update requests. We typically respond within 24 hours.",
      path: "/support",
    }),
});

// NOTE: replace with your real support inbox before publishing.
const SUPPORT_EMAIL = "support@hoonext.online";

const TOPICS = [
  { value: "billing", label: "Billing & payments" },
  { value: "technical", label: "Technical issue" },
  { value: "update_request", label: "Website update request" },
  { value: "general", label: "General question" },
];

function SupportPage() {
  const [form, setForm] = useState({ name: "", email: "", topic: "", message: "" });
  const [sent, setSent] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.email || !form.topic || !form.message)
        throw new Error("Please fill in all fields");
      const topicLabel = TOPICS.find((t) => t.value === form.topic)?.label ?? form.topic;
      const { error } = await supabase.from("contact_submissions").insert({
        name: form.name,
        email: form.email,
        subject: `Support — ${topicLabel}`,
        message: form.message,
        type: "support",
      });
      if (error) throw error;
    },
    onSuccess: () => setSent(true),
    onError: (e: any) => toast.error(e.message),
  });

  const faqs = [
    {
      q: "How long does support usually take?",
      a: "We aim to respond to all support requests within 24 hours on business days.",
    },
    {
      q: "I'm an existing customer — where do I request a site change?",
      a: "Log into your dashboard and open the Updates tab — that's the fastest way to track and chat about a specific change.",
    },
    {
      q: "Can I get a refund?",
      a: "See our Refund Policy for the details on Buy & Maintain, Subscription, and custom website requests.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="container-page py-16 md:py-20 max-w-3xl">
          <div className="text-xs uppercase tracking-widest text-primary font-medium">Support</div>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight">How can we help?</h1>
          <p className="mt-4 text-muted-foreground leading-relaxed max-w-xl">
            Whether it's a billing question, a technical issue, or something you'd like changed on
            your site, send us a message and we'll get back to you within 24 hours.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Mail, label: "Email us anytime", sub: SUPPORT_EMAIL },
              { icon: Clock, label: "Response time", sub: "Within 24 hours" },
              { icon: LifeBuoy, label: "Existing customer?", sub: "Use your dashboard" },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border border-border/70 bg-card/60 p-5">
                <c.icon className="h-5 w-5 text-primary" />
                <div className="mt-3 text-sm font-semibold">{c.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{c.sub}</div>
              </div>
            ))}
          </div>

          <div className="mt-14 rounded-2xl border border-border/70 bg-card/60 p-8">
            {sent ? (
              <div className="text-center py-8">
                <MessageCircle className="h-10 w-10 text-primary mx-auto" />
                <h3 className="mt-4 text-xl font-bold">Message sent</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  We'll get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-bold">Send us a message</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Your name
                    </label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Email address
                    </label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="jane@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    What's this about?
                  </label>
                  <Select value={form.topic} onValueChange={(v) => setForm({ ...form, topic: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a topic…" />
                    </SelectTrigger>
                    <SelectContent>
                      {TOPICS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Message
                  </label>
                  <Textarea
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us what's going on…"
                    className="resize-none"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => submit.mutate()}
                  disabled={submit.isPending}
                >
                  {submit.isPending ? "Sending…" : "Send message"}
                </Button>
              </div>
            )}
          </div>

          <div className="mt-14">
            <h2 className="text-xl font-bold">Common questions</h2>
            <div className="mt-5 space-y-4">
              {faqs.map((f) => (
                <div key={f.q} className="rounded-xl border border-border/60 bg-card/40 p-5">
                  <div className="font-semibold text-sm">{f.q}</div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
