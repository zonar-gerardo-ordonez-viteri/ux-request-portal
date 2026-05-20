"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Loader2, Send, LayoutList, Settings } from "lucide-react";

export default function Home() {
  const { profile, canViewRequests, canManageSettings, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--ig-fg3)]" />
      </main>
    );
  }

  const cards = [
    { href: "/request", icon: Send, title: "Submit a request", desc: "Need UX guidance? Submit a detailed request so our design team can help.", show: true },
    { href: "/dashboard", icon: LayoutList, title: "Request dashboard", desc: "View, filter, and manage all incoming UX requests.", show: canViewRequests },
    { href: "/admin/settings", icon: Settings, title: "Settings", desc: "Manage users, allowed domains, and autocomplete options.", show: canManageSettings },
  ].filter((c) => c.show);

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-[var(--ig-fg1)]">UX Request Portal</h1>
          <p className="text-[14px] text-[var(--ig-fg2)]">
            Welcome, {profile?.full_name || profile?.email || "User"}
          </p>
        </div>
        <div className={`grid gap-4 ${cards.length > 1 ? "sm:grid-cols-2" : ""} ${cards.length > 2 ? "sm:grid-cols-3" : ""}`}>
          {cards.map((c) => (
            <Link key={c.href} href={c.href}>
              <div className="ig-card ig-card-hover h-full flex flex-col" style={{ padding: 24 }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--ig-primary-light)" }}>
                    <c.icon className="w-[18px] h-[18px] text-[var(--ig-primary)]" />
                  </div>
                  <h3 className="font-semibold text-[15px] text-[var(--ig-fg1)]">{c.title}</h3>
                </div>
                <p className="text-[13px] text-[var(--ig-fg2)] leading-relaxed flex-1">{c.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
