import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({ component: Settings });

function Settings() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setName(data?.full_name || ""));
  }, [user]);

  const save = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, full_name: name, email: user.email });
    setLoading(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  return (
    <div className="max-w-xl space-y-6">
      <div><h2 className="text-2xl font-bold tracking-tight">Account Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Update your account information.</p></div>
      <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-4">
        <div className="space-y-2"><Label>Email</Label><Input value={user?.email || ""} disabled /></div>
        <div className="space-y-2"><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <Button onClick={save} disabled={loading}>Save</Button>
      </div>
    </div>
  );
}
