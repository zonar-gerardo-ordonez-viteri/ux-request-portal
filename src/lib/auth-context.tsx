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

async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) {
      console.warn("Profile fetch failed:", error.message);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [impersonatingAs, setImpersonatingAs] = React.useState<Role | null>(null);
  const currentUserId = React.useRef<string | null>(null);

  React.useEffect(() => {
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const sessionUser = session?.user ?? null;

        if (sessionUser) {
          currentUserId.current = sessionUser.id;
          setUser(sessionUser);
          const p = await fetchProfile(sessionUser.id);
          setProfile(p);
        }
      } catch (err) {
        console.warn("Auth init error:", err);
      } finally {
        setLoading(false);
      }
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user ?? null;
      const newId = newUser?.id ?? null;
      const prevId = currentUserId.current;

      // Always update the user object (keeps token fresh)
      setUser(newUser);

      if (!newUser) {
        // Signed out
        currentUserId.current = null;
        setProfile(null);
        setLoading(false);
        return;
      }

      // Only re-fetch profile if user actually changed (not just token refresh)
      if (newId !== prevId) {
        currentUserId.current = newId;
        const p = await fetchProfile(newUser.id);
        setProfile(p);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const realRole: Role = profile?.role ?? "requester";
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
