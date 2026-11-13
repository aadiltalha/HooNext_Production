import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Mail, CheckCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/contacts")({ component: AdminContacts });

function AdminContacts() {
  const qc = useQueryClient();

  const { data: contacts = [] } = useQuery({
    queryKey: ["admin-contacts"],
    queryFn: async () =>
      (await supabase.from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false })).data ?? [],
  });

  const markHandled = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_submissions")
        .update({ handled: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked as handled");
      qc.invalidateQueries({ queryKey: ["admin-contacts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const unhandled = contacts.filter((c: any) => !c.handled).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Contact Messages</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {unhandled > 0 ? `${unhandled} unhandled message${unhandled > 1 ? "s" : ""}` : "All messages handled"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card overflow-hidden divide-y divide-border/60">
        {contacts.length === 0 && (
          <div className="p-12 text-center text-muted-foreground text-sm">No contact submissions yet.</div>
        )}
        {contacts.map((c: any) => (
          <div key={c.id} className={cn("p-5 flex gap-4", c.handled && "opacity-50")}>
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Mail className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.email} · {formatDate(c.created_at)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.type === "custom_website" && (
                    <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400">
                      Custom site
                    </span>
                  )}
                  {!c.handled && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-xs h-7 gap-1"
                      onClick={() => markHandled.mutate(c.id)}
                    >
                      <CheckCheck className="h-3 w-3" /> Mark handled
                    </Button>
                  )}
                  {c.handled && (
                    <span className="text-[10px] uppercase tracking-widest text-emerald-400">✓ Handled</span>
                  )}
                </div>
              </div>
              {c.subject && <div className="mt-2 text-sm font-medium">{c.subject}</div>}
              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{c.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
