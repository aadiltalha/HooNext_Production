import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { noindexHead } from "@/lib/seo";

export const Route = createFileRoute("/forgot-password")({
  head: () => noindexHead("Reset password — HooNext"),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 gradient-hero">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8">
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="text-sm text-muted-foreground mt-1">We'll send you a reset link.</p>
        {sent ? (
          <div className="mt-6 text-sm">Check your email for a reset link.</div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              Send reset link
            </Button>
          </form>
        )}
        <div className="mt-6 text-sm text-center">
          <Link to="/auth" className="text-muted-foreground hover:text-foreground">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
