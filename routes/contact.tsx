import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/marketplace/site-header";
import { SiteFooter } from "@/components/marketplace/site-footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BuildingSpinner } from "@/components/shared/website-building-animation";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  component: Contact,
  head: () =>
    seo({
      title: "Contact — HooNext",
      description: "Get in touch with the HooNext team.",
      path: "/contact",
    }),
});

function Contact() {
  const { user, profile } = useAuth();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: profile?.full_name ?? "",
    email: profile?.email ?? user?.email ?? "",
    subject: "",
    message: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill in name, email and message.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("contact_submissions").insert({
      name: form.name,
      email: form.email,
      subject: form.subject || null,
      message: form.message,
      user_id: user?.id ?? null,
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    // The admin notification is created by a database trigger, so it also
    // works for visitors who are not signed in.
    setLoading(false);
    setSent(true);
    toast.success("Message sent — we'll be in touch shortly.");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-24 max-w-2xl">
        <div className="text-xs uppercase tracking-widest text-accent font-medium">Contact</div>
        <h1 className="mt-3 text-5xl font-bold tracking-tight">Talk to us</h1>
        <p className="mt-4 text-muted-foreground">We usually respond within one business day.</p>
        {sent ? (
          <div className="mt-10 rounded-2xl bg-secondary p-6">Thanks — we got your message.</div>
        ) : (
          <form onSubmit={onSubmit} className="mt-10 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="What's this about?"
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                rows={5}
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>
            <Button type="submit" className="h-11 btn-gradient border-0" disabled={loading}>
              {loading ? <BuildingSpinner label="Sending…" /> : "Send message"}
            </Button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
