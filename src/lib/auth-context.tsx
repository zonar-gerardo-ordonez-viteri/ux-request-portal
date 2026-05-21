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

// ── Profile fetch with 5s timeout ──

async function fetchProfile(userId: string): Promise<Profile | null> {
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), 5000));
  const query = supabase.from("profiles").select("*").eq("id", userId).single()
    .then(({ data }) => data as Profile | null);
  return Promise.race([query, timeout]);
}

// ── Provider ──

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [ready, setReady] = React.useState(false);
  const [impersonatingAs, setImpersonatingAs] = React.useState<Role | null>(null);

  // ── Step 1: Initialize on mount ──
  // The middleware already refreshed the token and wrote fresh cookies.
  // getSession() just reads those cookies — no network call needed.
  React.useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        const u = session?.user ?? null;
        setUser(u);

        if (u) {
          const p = await fetchProfile(u.id);
          if (cancelled) return;
          setProfile(p);
        }
      } catch (err) {
        console.warn("Auth init failed:", err);
      }

      if (!cancelled) setReady(true);
    }

    init();

    // ── Step 2: Listen for changes AFTER init (sign out, sign in from another tab) ──
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip events during init and token refreshes
        if (!ready || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;

        if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          setImpersonatingAs(null);
          return;
        }

        const newUser = session?.user ?? null;
        setUser(newUser);
        if (newUser) {
          const p = await fetchProfile(newUser.id);
          if (p) setProfile(p);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ──

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
