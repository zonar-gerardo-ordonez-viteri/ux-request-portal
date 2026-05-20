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
  /** The effective role — respects impersonation */
  effectiveRole: Role;
  /** The real role from the profile */
  realRole: Role;
  isAdmin: boolean;
  isLead: boolean;
  canViewRequests: boolean;
  canManageSettings: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  /** Impersonation (admin only) */
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

  React.useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(data);
      }
      setLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();
        setProfile(data);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const realRole: Role = profile?.role ?? "requester";
  // Only admins can impersonate, and it only changes the effective role for UI
  const effectiveRole: Role =
    realRole === "admin" && impersonatingAs ? impersonatingAs : realRole;

  const isAdmin = effectiveRole === "admin";
  const isLead = effectiveRole === "lead";
  const canViewRequests = effectiveRole === "admin" || effectiveRole === "lead";
  const canManageSettings = effectiveRole === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        effectiveRole,
        realRole,
        isAdmin,
        isLead,
        canViewRequests,
        canManageSettings,
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
