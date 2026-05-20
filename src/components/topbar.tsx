"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth, type Role } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Eye, LogOut, User } from "lucide-react";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  lead: "Lead",
  requester: "Requester",
};

const ROLE_COLORS: Record<Role, string> = {
  admin: "bg-primary text-primary-foreground",
  lead: "bg-blue-500 text-white",
  requester: "bg-muted text-muted-foreground",
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

  if (loading || !profile) return null;

  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : profile.email[0].toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 max-w-6xl mx-auto">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <img
            src="/zonar-logo-dark.svg"
            alt="Zonar"
            className="h-6"
          />
        </Link>

        {/* Right: Impersonator + Avatar */}
        <div className="flex items-center gap-2">
          {/* Impersonation banner */}
          {impersonatingAs && (
            <Badge variant="outline" className="text-xs border-orange-300 text-orange-600 bg-orange-50">
              Viewing as {ROLE_LABELS[impersonatingAs]}
            </Badge>
          )}

          {/* Impersonator button (admin only) */}
          {realRole === "admin" && (
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className={impersonatingAs ? "text-orange-600" : ""}
                  />
                }
              >
                <Eye className="h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent className="w-48" align="end">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">View as role</p>
                  <div className="space-y-1">
                    {(["admin", "lead", "requester"] as Role[]).map((role) => (
                      <button
                        key={role}
                        onClick={() =>
                          setImpersonatingAs(role === realRole ? null : role)
                        }
                        className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center justify-between transition-colors ${
                          effectiveRole === role
                            ? "bg-muted font-medium"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        {ROLE_LABELS[role]}
                        {role === realRole && (
                          <span className="text-xs text-muted-foreground">(you)</span>
                        )}
                      </button>
                    ))}
                  </div>
                  {impersonatingAs && (
                    <>
                      <Separator />
                      <button
                        onClick={() => setImpersonatingAs(null)}
                        className="w-full text-left px-2 py-1.5 rounded text-sm text-orange-600 hover:bg-orange-50 transition-colors"
                      >
                        Stop impersonating
                      </button>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Avatar dropdown */}
          <Popover>
            <PopoverTrigger
              render={
                <button className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity" />
              }
            >
              {initials}
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">{profile.full_name || "User"}</p>
                  <p className="text-xs text-muted-foreground">{profile.email}</p>
                  <Badge
                    className={`mt-1 text-xs border-transparent ${ROLE_COLORS[effectiveRole]}`}
                  >
                    {ROLE_LABELS[effectiveRole]}
                  </Badge>
                </div>
                <Separator />
                <button
                  onClick={signOut}
                  className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
