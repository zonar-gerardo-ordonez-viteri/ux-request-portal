"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export type Role = "admin" | "lead" | "requester";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  product_name: string;
  pm_name: string;
  lead_name: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  effectiveRole: Role;
  realRole: Role;
  isAdmin: boolean;
  isLead: boolean;
  canViewRequests: boolean;
  canManageSettings: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  impersonatingAs: Role | null;
  setImpersonatingAs: (role: Role | null) => void;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  profile: null,
  effectiveRole: "requester",
  realRole: "requester",
  isAdmin: false,
  isLead: false,
  canViewRequests: false,
  canManageSettings: false,
  loading: true,
  signOut: async () => {},
  impersonatingAs: null,
  setImpersonatingAs: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [impersonatingAs, setImpersonatingAs] = React.useState<Role | null>(null);
  const currentUserId = React.useRef<string | null>(null);

  React.useEffect(() => {
    // Safety net: force loading false after 3s no matter what
    const safety = setTimeout(() => setLoading(false), 3000);

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const u = session?.user ?? null;
        setUser(u);
        clearTimeout(safety);
        setLoading(false);
        if (u) {
          currentUserId.current = u.id;
          const { data } = await supabase.from("profiles").select("*").eq("id", u.id).single();
          if (data) setProfile(data);
        }
      } catch {
        clearTimeout(safety);
        setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "TOKEN_REFRESHED") return;
      const newUser = session?.user ?? null;
      const newId = newUser?.id ?? null;
      setUser(newUser);
      if (!newUser) {
        currentUserId.current = null;
        setProfile(null);
        return;
      }
      if (newId !== currentUserId.current) {
        currentUserId.current = newId;
        const { data } = await supabase.from("profiles").select("*").eq("id", newUser.id).single();
        if (data) setProfile(data);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const realRole: Role = profile?.role ?? "requester";
  const effectiveRole: Role = realRole === "admin" && impersonatingAs ? impersonatingAs : realRole;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        effectiveRole,
        realRole,
        isAdmin: effectiveRole === "admin",
        isLead: effectiveRole === "lead",
        canViewRequests: effectiveRole === "admin" || effectiveRole === "lead",
        canManageSettings: effectiveRole === "admin",
        loading,
        signOut,
        impersonatingAs,
        setImpersonatingAs: realRole === "admin" ? setImpersonatingAs : () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}
