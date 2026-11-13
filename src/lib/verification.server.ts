// Server-side check that a buyer's contact details are verified before they
// can pay, so we can always reach them. Source of truth is Supabase Auth
// (auth.users.email_confirmed_at / phone_confirmed_at), read with the service
// role: a client can never fake it by editing its own profile row.

interface AdminAuthClient {
  from(table: string): {
    upsert(
      row: Record<string, unknown>,
      opts?: { onConflict?: string },
    ): PromiseLike<{ error: unknown }>;
  };
  auth: {
    admin: {
      getUserById(id: string): Promise<{
        data: {
          user: {
            email?: string | null;
            phone?: string | null;
            email_confirmed_at?: string | null;
            phone_confirmed_at?: string | null;
          } | null;
        };
        error: unknown;
      }>;
    };
  };
}

export function phoneVerificationRequired(): boolean {
  const v = (
    process.env.REQUIRE_PHONE_VERIFICATION ??
    process.env.VITE_REQUIRE_PHONE_VERIFICATION ??
    "true"
  ).toLowerCase();
  return v !== "false" && v !== "0" && v !== "off";
}

export interface VerifiedContact {
  email: string | null;
  email_verified: boolean;
  email_verified_at: string | null;
  phone: string | null;
  phone_verified: boolean;
  phone_verified_at: string | null;
}

export async function getVerifiedContact(
  admin: AdminAuthClient,
  userId: string,
): Promise<VerifiedContact> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  const u = data?.user;
  if (error || !u) throw new Error("Could not load your account");
  return {
    email: u.email ?? null,
    email_verified: Boolean(u.email_confirmed_at),
    email_verified_at: u.email_confirmed_at ?? null,
    phone: u.phone ? (u.phone.startsWith("+") ? u.phone : `+${u.phone}`) : null,
    phone_verified: Boolean(u.phone_confirmed_at),
    phone_verified_at: u.phone_confirmed_at ?? null,
  };
}

/**
 * Reads the buyer's verified email/phone from Supabase Auth and saves them to
 * public.contact_verifications so admins can see them. Idempotent.
 */
export async function saveContactVerification(
  admin: AdminAuthClient,
  userId: string,
): Promise<VerifiedContact> {
  const c = await getVerifiedContact(admin, userId);
  const { error } = await admin.from("contact_verifications").upsert(
    {
      user_id: userId,
      email: c.email,
      email_verified_at: c.email_verified_at,
      phone: c.phone,
      phone_verified_at: c.phone_verified_at,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
  return c;
}

/** Throws a user-facing error if the buyer must still verify something. */
export async function assertContactVerified(
  admin: AdminAuthClient,
  userId: string,
): Promise<VerifiedContact> {
  const c = await getVerifiedContact(admin, userId);
  if (!c.email_verified) throw new Error("Please verify your email address before checkout.");
  if (phoneVerificationRequired() && !c.phone_verified) {
    throw new Error("Please verify your phone number before checkout.");
  }
  return c;
}
