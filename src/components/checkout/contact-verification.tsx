import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Mail, Pencil, Phone, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Contact verification (email + phone) shown before a customer can continue.
 *
 *  - Email: Supabase sends the confirmation link; we detect the confirmation
 *    automatically (no manual refresh needed).
 *  - Phone: Supabase Auth sends a one-time code by SMS (`updateUser({ phone })`)
 *    and we confirm it with `verifyOtp({ type: "phone_change" })`.
 *
 * The browser UI is a convenience only. The server re-checks Supabase Auth
 * before taking payment, and stores the verified details in the database.
 *
 * Phone codes are sent by Supabase Auth through Twilio. Configure it once in
 * Supabase → Authentication → Providers → Phone (Twilio Account SID, Auth Token
 * and Message Service SID). Turn it off with
 * VITE_REQUIRE_PHONE_VERIFICATION=false (and REQUIRE_PHONE_VERIFICATION=false).
 */

export const PHONE_VERIFICATION_REQUIRED =
  String(import.meta.env.VITE_REQUIRE_PHONE_VERIFICATION ?? "true").toLowerCase() !== "false";

/** What the signed-in user still has to verify before continuing. */
export function useContactVerified() {
  const { user } = useAuth();
  const emailOk = Boolean(user?.email_confirmed_at);
  const phoneOk = !PHONE_VERIFICATION_REQUIRED || Boolean(user?.phone_confirmed_at);
  return { emailOk, phoneOk, verified: emailOk && phoneOk, loading: !user };
}

// ─── Phone number helpers ─────────────────────────────────────────────────────

export const COUNTRY_CODES = [
  { dial: "+1", label: "US / Canada (+1)" },
  { dial: "+91", label: "India (+91)" },
  { dial: "+44", label: "United Kingdom (+44)" },
  { dial: "+61", label: "Australia (+61)" },
  { dial: "+971", label: "UAE (+971)" },
  { dial: "+65", label: "Singapore (+65)" },
] as const;

const OTHER = "other";

/**
 * Builds an E.164 number ("+15551234567") from a country code and what the
 * user typed. A number typed with its own "+" is used as-is. Returns null when
 * the result can't be a valid number. Never guesses a country.
 */
export function toE164(dial: string, input: string): string | null {
  const raw = input.trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (raw.startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (dial === OTHER) return null; // "Other" requires an explicit +country code

  const dialDigits = dial.replace(/\D/g, "");
  // People often type the trunk "0" (e.g. 098765 43210); E.164 has none.
  const national = dial === "+1" ? digits.replace(/^1(?=\d{10}$)/, "") : digits.replace(/^0+/, "");
  if (dial === "+1" && national.length !== 10) return null;

  const total = dialDigits.length + national.length;
  return total >= 8 && total <= 15 ? `+${dialDigits}${national}` : null;
}

/** Splits a stored/typed number into a country-code choice + remaining digits. */
export function splitPhone(value?: string): { dial: string; national: string } {
  const v = (value ?? "").trim();
  if (!v.startsWith("+")) return { dial: "+1", national: v };
  const match = [...COUNTRY_CODES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => v.replace(/\s/g, "").startsWith(c.dial));
  if (!match) return { dial: OTHER, national: v };
  return { dial: match.dial, national: v.replace(/\s/g, "").slice(match.dial.length) };
}

export function maskPhone(e164: string): string {
  const d = e164.replace(/^\+/, "");
  return d.length <= 4 ? `+${d}` : `+${d.slice(0, d.length - 4).replace(/\d/g, "•")}${d.slice(-4)}`;
}

// ─── Error messages ───────────────────────────────────────────────────────────

// Twilio error codes that Supabase passes through (it quotes
// "https://www.twilio.com/docs/errors/<code>"). Each has a plain message for
// customers and a fix for whoever runs the site (shown only in development).
const TWILIO_ERRORS: Record<string, { customer: string; admin: string }> = {
  "572002": {
    customer:
      "We can't text this number right now. Please try a different number or contact support.",
    admin:
      "Twilio TRIAL account: add this number in Twilio Console → Phone Numbers → Manage → Verified Caller IDs, or upgrade the Twilio account (see twilio.com/docs/errors/572002).",
  },
  "21608": {
    customer:
      "We can't text this number right now. Please try a different number or contact support.",
    admin:
      "Twilio TRIAL account can only text verified numbers: add it under Twilio Console → Phone Numbers → Manage → Verified Caller IDs, or upgrade the account.",
  },
  "21408": {
    customer:
      "We can't send text messages to that country yet. Please try another number or contact support.",
    admin: "Enable this country in Twilio Console → Messaging → Settings → Geo permissions.",
  },
  "21211": {
    customer: "That phone number doesn't look valid. Check the country code and number.",
    admin: "Twilio rejected the 'To' number as invalid.",
  },
  "21614": {
    customer:
      "That doesn't look like a mobile number that can receive texts. Please try another number.",
    admin: "Twilio says the 'To' number is not a valid mobile number.",
  },
  "21610": {
    customer:
      "This number has opted out of text messages. Please use a different number or contact support.",
    admin: "The recipient replied STOP to your Twilio number; they must reply START.",
  },
  "30007": {
    customer:
      "The mobile carrier blocked this message. Please try again later or use a different number.",
    admin:
      "Carrier filtering. For US numbers complete Twilio A2P 10DLC registration (or use a verified toll-free sender).",
  },
  "30034": {
    customer:
      "The mobile carrier blocked this message. Please try again later or use a different number.",
    admin:
      "US carriers block unregistered senders: complete Twilio A2P 10DLC registration (or use a verified toll-free sender).",
  },
};

function twilioCode(msg: string): string | undefined {
  const fromUrl = /errors\/(\d{4,6})/.exec(msg)?.[1];
  if (fromUrl) return fromUrl;
  return Object.keys(TWILIO_ERRORS).find((code) => new RegExp(`\\b${code}\\b`).test(msg));
}

/**
 * Turns an auth error into something safe to show a customer. The technical
 * detail (what Supabase/Twilio actually said, and how to fix it) is appended
 * ONLY while developing (`import.meta.env.DEV`); it is always in the console.
 */
export function friendlyAuthError(message: string, status?: number): string {
  const msg = message || "";
  const dev = Boolean(import.meta.env.DEV);
  const withAdmin = (customer: string, admin: string) =>
    dev ? `${customer} [Admin: ${admin}]` : customer;

  // The Phone provider itself is switched off.
  if (
    /phone.*(disabled|not enabled|unsupported|not allowed)|unsupported phone provider/i.test(msg)
  ) {
    return withAdmin(
      "Phone verification isn't available right now. Please contact support.",
      `Supabase said: ${msg}. Enable Authentication → Providers → Phone.`,
    );
  }

  // A specific, known Twilio problem.
  const known = TWILIO_ERRORS[twilioCode(msg) ?? ""];
  if (known) return withAdmin(known.customer, known.admin);

  // Supabase accepted the request but could not deliver the SMS.
  if (
    (status !== undefined && status >= 500) ||
    /provider|sms|twilio|messagebird|vonage|textlocal|unexpected_failure/i.test(msg)
  ) {
    return withAdmin(
      "We couldn't send the text message. Please check the number and try again, or contact support.",
      `Supabase said: ${msg || "(no message)"}. Check Supabase → Authentication → Providers → Phone, then Twilio Console → Monitor → Logs → Messaging.`,
    );
  }
  if (/already|registered|exists|taken/i.test(msg)) {
    return "That phone number is already linked to another account.";
  }
  if (/token|otp|code/i.test(msg) && /expired|invalid|incorrect/i.test(msg)) {
    return "That code is incorrect or has expired. Request a new one and try again.";
  }
  if (/rate|too many|seconds|frequen/i.test(msg) || status === 429) {
    return "Please wait a moment before requesting another code.";
  }
  if (/invalid.*(phone|number)|phone.*invalid/i.test(msg)) {
    return "That phone number doesn't look valid. Check the country code and number.";
  }
  return msg || "Something went wrong. Please try again.";
}

const errStatus = (e: unknown) => (e as { status?: number } | null)?.status;

const PHONE_COOLDOWN_SECONDS = 30;
const EMAIL_COOLDOWN_SECONDS = 60;
const EMAIL_POLL_MS = 4000;

// ─── Component ────────────────────────────────────────────────────────────────

export function ContactVerification({
  defaultPhone,
  onVerified,
}: {
  /** Pre-fills the phone field (e.g. the number typed on the customize form). */
  defaultPhone?: string;
  /** Called once when everything required has been verified. */
  onVerified?: () => void;
}) {
  const { user } = useAuth();
  const { emailOk, phoneOk, verified } = useContactVerified();

  const initial = splitPhone(defaultPhone);
  const [dial, setDial] = useState<string>(initial.dial);
  const [national, setNational] = useState(initial.national);
  const [code, setCode] = useState("");
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [busy, setBusy] = useState<"send" | "verify" | "email" | null>(null);
  const [phoneCooldown, setPhoneCooldown] = useState(0);
  const [emailCooldown, setEmailCooldown] = useState(0);

  // Cooldown timers
  useEffect(() => {
    if (phoneCooldown <= 0) return;
    const t = setTimeout(() => setPhoneCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phoneCooldown]);
  useEffect(() => {
    if (emailCooldown <= 0) return;
    const t = setTimeout(() => setEmailCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [emailCooldown]);

  // ── Email: notice the confirmation without a manual refresh ──────────────
  const emailToastShown = useRef(false);
  const checkEmail = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    const { data } = await supabase.auth.getUser();
    if (data.user?.email_confirmed_at) {
      await supabase.auth.refreshSession(); // updates the signed-in user everywhere
      if (!emailToastShown.current) {
        emailToastShown.current = true;
        toast.success("Email verified.");
      }
    }
  }, []);

  useEffect(() => {
    if (emailOk || !user) return;
    const interval = setInterval(checkEmail, EMAIL_POLL_MS);
    window.addEventListener("focus", checkEmail);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", checkEmail);
    };
  }, [emailOk, user, checkEmail]);

  // Tell the parent once, when everything required is done.
  const notified = useRef(false);
  useEffect(() => {
    if (verified && !notified.current) {
      notified.current = true;
      onVerified?.();
    }
  }, [verified, onVerified]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const resendEmail = async () => {
    if (!user?.email || emailCooldown > 0) return;
    setBusy("email");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
      options: { emailRedirectTo: window.location.href },
    });
    setBusy(null);
    if (error) {
      toast.error(friendlyAuthError(error.message, errStatus(error)));
      return;
    }
    setEmailCooldown(EMAIL_COOLDOWN_SECONDS);
    toast.success(`Verification email sent to ${user.email}. Open the link, then return here.`);
  };

  const sendCode = async () => {
    if (busy) return;
    const e164 = toE164(dial, national);
    if (!e164) {
      toast.error(
        dial === OTHER
          ? "Type the full number starting with + and your country code."
          : dial === "+1"
            ? "Enter a 10-digit US/Canada number."
            : "Enter a valid phone number for the selected country.",
      );
      return;
    }
    if (phoneOk && user?.phone && `+${user.phone.replace(/^\+/, "")}` === e164) {
      toast.info("That number is already verified.");
      setChanging(false);
      return;
    }

    setBusy("send");
    const { error } = await supabase.auth.updateUser({ phone: e164 });
    setBusy(null);
    if (error) {
      console.error("[phone verification] updateUser failed:", error);
      toast.error(friendlyAuthError(error.message, errStatus(error)));
      return;
    }
    setCodeSentTo(e164);
    setCode("");
    setPhoneCooldown(PHONE_COOLDOWN_SECONDS);
    toast.success(`We texted a code to ${maskPhone(e164)}.`);
  };

  const verifyCode = async () => {
    if (busy || !codeSentTo || code.trim().length < 4) return;
    setBusy("verify");
    const { error } = await supabase.auth.verifyOtp({
      phone: codeSentTo,
      token: code.trim(),
      type: "phone_change",
    });
    if (error) {
      setBusy(null);
      console.error("[phone verification] verifyOtp failed:", error);
      toast.error(friendlyAuthError(error.message, errStatus(error)));
      return;
    }
    await supabase.auth.refreshSession(); // pull the new phone_confirmed_at
    setBusy(null);
    setCode("");
    setCodeSentTo(null);
    setChanging(false);
    toast.success("Phone number verified.");
  };

  const showPhoneForm = PHONE_VERIFICATION_REQUIRED && (!phoneOk || changing);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm">
          <div className="font-semibold">Verify how we can reach you</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            We build your website together, so we need a confirmed email
            {PHONE_VERIFICATION_REQUIRED ? " and mobile number" : ""} before you continue.
          </div>
        </div>
      </div>

      {/* ── Email ── */}
      <div className="rounded-xl border border-border/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium">Email</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
          </div>
          {emailOk ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400 shrink-0">
              <CheckCircle2 className="h-4 w-4" /> Verified
            </span>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={resendEmail}
              disabled={busy === "email" || emailCooldown > 0}
            >
              {busy === "email" && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {emailCooldown > 0 ? `Resend in ${emailCooldown}s` : "Send verification email"}
            </Button>
          )}
        </div>
        {!emailOk && (
          <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
            Open the link we email you. This page updates by itself once it's confirmed.
          </p>
        )}
      </div>

      {/* ── Phone ── */}
      {PHONE_VERIFICATION_REQUIRED && (
        <div className="rounded-xl border border-border/70 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium">Mobile number</div>
                {phoneOk && user?.phone && !changing && (
                  <div className="text-xs text-muted-foreground">
                    +{user.phone.replace(/^\+/, "")}
                  </div>
                )}
              </div>
            </div>
            {phoneOk && !changing ? (
              <div className="flex items-center gap-3 shrink-0">
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Verified
                </span>
                <button
                  type="button"
                  onClick={() => setChanging(true)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-3 w-3" /> Change
                </button>
              </div>
            ) : null}
          </div>

          {showPhoneForm && (
            <>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={dial}
                  onChange={(e) => setDial(e.target.value)}
                  disabled={busy !== null}
                  aria-label="Country code"
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm sm:w-48 shrink-0"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.dial} value={c.dial}>
                      {c.label}
                    </option>
                  ))}
                  <option value={OTHER}>Other (type +code)</option>
                </select>
                <Input
                  value={national}
                  onChange={(e) => setNational(e.target.value)}
                  placeholder={
                    dial === "+1"
                      ? "555 123 4567"
                      : dial === OTHER
                        ? "+49 151 2345678"
                        : "Phone number"
                  }
                  inputMode="tel"
                  autoComplete="tel-national"
                  aria-label="Phone number"
                  disabled={busy !== null}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      sendCode();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={sendCode}
                  disabled={busy !== null || phoneCooldown > 0}
                  className="shrink-0"
                >
                  {busy === "send" && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  {codeSentTo
                    ? phoneCooldown > 0
                      ? `Resend in ${phoneCooldown}s`
                      : "Resend code"
                    : "Send code"}
                </Button>
              </div>

              {codeSentTo && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    Enter the code we sent to {maskPhone(codeSentTo)}.{" "}
                    <button
                      type="button"
                      className="underline hover:text-foreground"
                      onClick={() => {
                        setCodeSentTo(null);
                        setCode("");
                      }}
                    >
                      Use a different number
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                      placeholder="6-digit code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      aria-label="Verification code"
                      disabled={busy === "verify"}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          verifyCode();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={verifyCode}
                      disabled={busy !== null || code.length < 4}
                    >
                      {busy === "verify" && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                      Verify
                    </Button>
                  </div>
                </div>
              )}

              {changing && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                  onClick={() => {
                    setChanging(false);
                    setCodeSentTo(null);
                    setCode("");
                  }}
                >
                  Keep my current number
                </button>
              )}

              <p className="text-[11px] text-muted-foreground">
                Choose your country code first. Standard message rates may apply.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
