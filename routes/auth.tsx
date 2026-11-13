import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { noindexHead } from "@/lib/seo";

const search = z.object({
  mode: z.enum(["login", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  head: () => noindexHead("Sign in — HooNext"),
  validateSearch: search,
  component: AuthPage,
});

function AuthPage() {
  const { mode = "login", redirect: redirectTo } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsSignup(mode === "signup");
  }, [mode]);
  useEffect(() => {
    if (user) navigate({ to: (redirectTo as any) || "/dashboard" });
  }, [user, redirectTo, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("Account created!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 gradient-hero">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 font-semibold justify-center mb-8">
          <div className="h-7 w-7 rounded-lg bg-foreground" />
          HooNext
        </Link>
        <div className="rounded-2xl border border-border/70 bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSignup ? "Start browsing premium templates." : "Sign in to your HooNext account."}
          </p>

          <Button
            type="button"
            variant="outline"
            className="w-full mt-6 h-11"
            onClick={google}
            disabled={loading}
          >
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 border-t" /> OR <div className="flex-1 border-t" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Password</Label>
                {!isSignup && (
                  <Link
                    to="/forgot-password"
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Forgot?
                  </Link>
                )}
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "…" : isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 text-sm text-center text-muted-foreground">
            {isSignup ? "Already have an account? " : "New to HooNext? "}
            <button
              className="text-foreground font-medium hover:underline"
              onClick={() => setIsSignup(!isSignup)}
            >
              {isSignup ? "Sign in" : "Create one"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
