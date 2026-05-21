"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

// ── Types ──

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

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  ready: boolean;
  effectiveRole: Role;
  realRole: Role;
  isAdmin: boolean;
  canViewRequests: boolean;
  canManageSettings: boolean;
  impersonatingAs: Role | null;
  setImpersonatingAs: (role: Role | null) => void;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

// ── Provider ──

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [ready, setReady] = React.useState(false);
  const [impersonatingAs, setImpersonatingAs] = React.useState<Role | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    // onAuthStateChange fires INITIAL_SESSION immediately with the stored session.
    // This is the ONLY way we initialize auth — no separate getSession() call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "TOKEN_REFRESHED") return;
        if (cancelled) return;

        const newUser = session?.user ?? null;
        setUser(newUser);

        if (newUser) {
          // Fetch profile — MUST complete before marking ready
          try {
            const { data } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", newUser.id)
              .single();
            if (!cancelled) {
              setProfile(data ?? null);
              setReady(true);
            }
          } catch {
            if (!cancelled) {
              setProfile(null);
              setReady(true);
            }
          }
        } else {
          // No user — clear everything, mark ready
          setProfile(null);
          setImpersonatingAs(null);
          setReady(true);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // ── Derived permissions ──

  const realRole: Role = profile?.role ?? "requester";
  const effectiveRole: Role =
    realRole === "admin" && impersonatingAs ? impersonatingAs : realRole;

  const value: AuthContextValue = {
    user,
    profile,
    ready,
    effectiveRole,
    realRole,
    isAdmin: effectiveRole === "admin",
    canViewRequests: effectiveRole === "admin" || effectiveRole === "lead",
    canManageSettings: effectiveRole === "admin",
    impersonatingAs,
    setImpersonatingAs: (role) => {
      if (realRole !== "admin") return;
      setImpersonatingAs(role);
    },
    signOut: async () => {
      await supabase.auth.signOut();
      window.location.href = "/login";
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ──

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
