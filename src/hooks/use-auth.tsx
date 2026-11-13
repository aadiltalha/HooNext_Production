import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  client_code: string | null;
  avatar_url: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  profile: Profile | null;
  clientCode: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // The role + profile are loaded ONCE per signed-in user. Previously they were
  // fetched 2-3 times at startup (auth event + getSession) and again on every
  // silent token refresh or session refresh, each one re-rendering the app.
  const loadedFor = useRef<string | null>(null);

  const loadUserExtras = useCallback((uid: string) => {
    if (loadedFor.current === uid) return;
    loadedFor.current = uid;
    // Deferred: calling Supabase inside onAuthStateChange can deadlock.
    setTimeout(async () => {
      try {
        const [{ data: role }, { data: prof }] = await Promise.all([
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", uid)
            .eq("role", "admin")
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("id,email,full_name,client_code,avatar_url")
            .eq("id", uid)
            .maybeSingle(),
        ]);
        if (loadedFor.current !== uid) return; // signed out / switched meanwhile
        setIsAdmin(Boolean(role));
        setProfile((prof as Profile) ?? null);
      } catch {
        if (loadedFor.current === uid) loadedFor.current = null; // allow a retry
      }
    }, 0);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      // Only replace the session object when something that matters changed,
      // so silent token refreshes don't re-render every page.
      setSession((prev) => {
        if (
          prev?.user?.id === s?.user?.id &&
          prev?.access_token === s?.access_token &&
          prev?.user?.updated_at === s?.user?.updated_at
        ) {
          return prev;
        }
        return s;
      });
      if (s?.user) loadUserExtras(s.user.id);
      else {
        loadedFor.current = null;
        setIsAdmin(false);
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession((prev) => prev ?? data.session);
      if (data.session?.user) loadUserExtras(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadUserExtras]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // Stable value: consumers re-render only when something they read changes.
  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      isAdmin,
      profile,
      clientCode: profile?.client_code ?? null,
      signOut,
    }),
    [session, loading, isAdmin, profile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
