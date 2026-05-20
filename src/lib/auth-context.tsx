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
  const initializedRef = React.useRef(false);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) setProfile(data);
  }

  React.useEffect(() => {
    // Register the auth state listener FIRST, before getSession.
    // onAuthStateChange fires INITIAL_SESSION as its first event,
    // which gives us the session without any race condition.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip token refresh events — they don't change the user
        if (event === "TOKEN_REFRESHED") return;

        const newUser = session?.user ?? null;
        const newId = newUser?.id ?? null;

        setUser(newUser);

        if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
          // Mark initialization complete on the first event we receive
          if (!initializedRef.current) {
            initializedRef.current = true;
            setLoading(false);
          }
        }

        if (event === "SIGNED_OUT") {
          currentUserId.current = null;
          setProfile(null);
          if (!initializedRef.current) {
            initializedRef.current = true;
            setLoading(false);
          }
          return;
        }

        if (!newUser) {
          currentUserId.current = null;
          setProfile(null);
          return;
        }

        // Only fetch profile if the user changed
        if (newId !== currentUserId.current) {
          currentUserId.current = newId;
          await fetchProfile(newUser.id);
        }
      }
    );

    // Safety net: if onAuthStateChange never fires (should not happen,
    // but guards against edge cases), clear loading after 10 seconds.
    const safetyTimer = setTimeout(() => {
      if (!initializedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
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
