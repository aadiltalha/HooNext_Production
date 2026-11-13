import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Called by the customize page once the user has verified their email/phone.
 * The server re-reads the truth from Supabase Auth (the browser is not trusted)
 * and saves it to the database, where the admin Customers page reads it.
 */
export const syncContactVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { saveContactVerification } = await import("@/lib/verification.server");
    const c = await saveContactVerification(supabaseAdmin, context.userId);
    return {
      email_verified: c.email_verified,
      phone_verified: c.phone_verified,
    };
  });
