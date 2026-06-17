import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  current_company_id: string | null;
}

export interface Membership {
  id: string;
  company_id: string;
  role: "master" | "admin" | "manager" | "seller" | "agent" | "user";
  position: string | null;
  status: "active" | "invited" | "suspended";
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  memberships: Membership[];
  isPlatformMaster: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isPlatformMaster, setIsMaster] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAuxData = async (userId: string) => {
    const [{ data: p }, { data: m }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("company_members").select("*").eq("user_id", userId),
      supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "master"),
    ]);
    setProfile((p as Profile) ?? null);
    setMemberships((m as Membership[]) ?? []);
    setIsMaster(Boolean(r && r.length > 0));
  };

  const refresh = async () => {
    if (session?.user) await loadAuxData(session.user.id);
  };

  useEffect(() => {
    // 1. Register listener FIRST (recommended order)
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s?.user) {
        // Defer to avoid blocking the listener
        setTimeout(() => loadAuxData(s.user.id), 0);
      } else {
        setProfile(null);
        setMemberships([]);
        setIsMaster(false);
      }
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setMemberships([]);
        setIsMaster(false);
      }
    });

    // 2. Then fetch current session
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadAuxData(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        memberships,
        isPlatformMaster,
        loading,
        refresh,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
