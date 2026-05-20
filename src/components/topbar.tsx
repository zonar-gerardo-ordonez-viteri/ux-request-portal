"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth, type Role } from "@/lib/auth-context";
import { Eye, LogOut, ChevronDown } from "lucide-react";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  lead: "Lead",
  requester: "Requester",
};

export function Topbar() {
  const {
    profile,
    effectiveRole,
    realRole,
    impersonatingAs,
    setImpersonatingAs,
    signOut,
    loading,
  } = useAuth();

  const [impMenu, setImpMenu] = React.useState(false);
  const [avatarMenu, setAvatarMenu] = React.useState(false);
  const impRef = React.useRef<HTMLDivElement>(null);
  const avatarRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (impRef.current && !impRef.current.contains(e.target as Node)) setImpMenu(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (loading || !profile) return null;

  const initials = profile.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : profile.email[0].toUpperCase();

  return (
    <header className="ig-topbar">
      <div className="ig-container flex items-center gap-4 h-full">
      <Link href="/" className="flex items-center shrink-0">
        <img src="/zonar-logo-light.svg" alt="Zonar" className="h-5" />
      </Link>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {impersonatingAs && (
          <span className="ig-pill ig-pill-orange ig-pill-sm">
            Viewing as {ROLE_LABELS[impersonatingAs]}
          </span>
        )}

        {realRole === "admin" && (
          <div className="relative" ref={impRef}>
            <button
              onClick={() => setImpMenu(!impMenu)}
              className={`ig-iconbtn ${impersonatingAs ? "text-[#E65100]" : ""}`}
              title="Impersonate role"
            >
              <Eye className="w-[18px] h-[18px]" />
            </button>
            {impMenu && (
              <div className="ig-popover absolute right-0 top-full mt-1 w-44">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ig-fg3)] px-2 mb-2">View as role</p>
                {(["admin", "lead", "requester"] as Role[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      setImpersonatingAs(role === realRole ? null : role);
                      setImpMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-[13px] flex items-center justify-between transition-colors ${
                      effectiveRole === role ? "bg-[var(--ig-surface)] font-semibold" : "hover:bg-[var(--ig-surface)]"
                    }`}
                  >
                    {ROLE_LABELS[role]}
                    {role === realRole && <span className="text-[11px] text-[var(--ig-fg3)]">(you)</span>}
                  </button>
                ))}
                {impersonatingAs && (
                  <>
                    <div className="ig-sep my-2" />
                    <button
                      onClick={() => { setImpersonatingAs(null); setImpMenu(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-[#E65100] hover:bg-[#FFF3E0] transition-colors"
                    >
                      Stop impersonating
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <div className="relative" ref={avatarRef}>
          <button
            onClick={() => setAvatarMenu(!avatarMenu)}
            className="ig-avatar"
            style={{ width: 32, height: 32, fontSize: 12 }}
          >
            {initials}
          </button>
          {avatarMenu && (
            <div className="ig-popover absolute right-0 top-full mt-1" style={{ minWidth: 224, whiteSpace: "nowrap" }}>
              <div className="px-2 pb-2">
                <p className="text-[13px] font-semibold text-[var(--ig-fg1)]">{profile.full_name || "User"}</p>
                <p className="text-[12px] text-[var(--ig-fg3)]">{profile.email}</p>
                <span className="ig-pill ig-pill-sm ig-pill-blue mt-1">{ROLE_LABELS[effectiveRole]}</span>
              </div>
              <div className="ig-sep" />
              <button
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); signOut(); }}
                className="w-full text-left px-3 py-2 mt-1 rounded-lg text-[13px] text-[var(--ig-fg2)] hover:bg-[var(--ig-surface)] flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-[14px] h-[14px]" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </header>
  );
}
