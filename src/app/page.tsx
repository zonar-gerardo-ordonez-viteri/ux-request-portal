"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Loader2, Send, LayoutList, Settings } from "lucide-react";

const MODULE_CARDS = [
  {
    key: "request",
    href: "/request",
    icon: Send,
    title: "Submit a request",
    desc: "Need UX guidance? Submit a detailed request so our design team can help.",
    gradient: "linear-gradient(135deg, rgba(0,91,248,0.25) 0%, rgba(0,174,239,0.15) 100%)",
    iconBg: "rgba(0,91,248,0.3)",
    iconColor: "#5B9AFF",
    access: () => true,
  },
  {
    key: "dashboard",
    href: "/dashboard",
    icon: LayoutList,
    title: "Request dashboard",
    desc: "View, filter, and manage all incoming UX requests.",
    gradient: "linear-gradient(135deg, rgba(132,0,255,0.25) 0%, rgba(0,91,248,0.15) 100%)",
    iconBg: "rgba(132,0,255,0.3)",
    iconColor: "#B47AFF",
    access: (canView: boolean) => canView,
  },
  {
    key: "settings",
    href: "/admin/settings",
    icon: Settings,
    title: "Settings",
    desc: "Manage users, allowed domains, and autocomplete options.",
    gradient: "linear-gradient(135deg, rgba(0,174,239,0.25) 0%, rgba(102,174,0,0.15) 100%)",
    iconBg: "rgba(0,174,239,0.3)",
    iconColor: "#33D6FF",
    access: (_: boolean, canManage: boolean) => canManage,
  },
];

export default function Home() {
  const { profile, canViewRequests, canManageSettings, loading } = useAuth();
  const router = useRouter();

  const visibleCards = MODULE_CARDS.filter((c) => c.access(canViewRequests, canManageSettings));
  const [redirecting, setRedirecting] = React.useState(false);

  // If only 1 module accessible, skip splash and go directly
  useEffect(() => {
    if (!loading && visibleCards.length === 1 && !redirecting) {
      setRedirecting(true);
      router.replace(visibleCards[0].href);
    }
  }, [loading, visibleCards.length, redirecting, router]);

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--ig-fg3)]" />
      </main>
    );
  }

  if (visibleCards.length <= 1) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--ig-fg3)]" />
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="ig-container px-6">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-[var(--ig-fg1)]">UX Request Portal</h1>
            <p className="text-[14px] text-[var(--ig-fg2)]">
              Welcome, {profile?.full_name || profile?.email || "User"}
            </p>
          </div>
          <div className={`grid gap-4 ${visibleCards.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
            {visibleCards.map((c) => (
              <Link key={c.key} href={c.href}>
                <div
                  className="ig-card ig-card-hover h-full flex flex-col overflow-hidden"
                  style={{ padding: 0 }}
                >
                  <div className="px-5 pt-5 pb-4" style={{ background: c.gradient }}>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: c.iconBg }}
                    >
                      <c.icon className="w-5 h-5" style={{ color: c.iconColor }} />
                    </div>
                    <h3 className="font-semibold text-[15px] text-[var(--ig-fg1)]">{c.title}</h3>
                  </div>
                  <div className="px-5 py-4 flex-1">
                    <p className="text-[13px] text-[var(--ig-fg2)] leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
