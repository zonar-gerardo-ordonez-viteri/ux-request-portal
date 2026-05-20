"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { PRIORITY_OPTIONS, type UxRequest } from "@/lib/types";
import { Loader2, Send, LayoutList, Settings, ExternalLink, Image as ImageIcon } from "lucide-react";

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

function getPriorityPillClass(priority: string): string {
  switch (priority) {
    case "highest": return "ig-pill ig-pill-sm ig-pill-solid-red";
    case "high": return "ig-pill ig-pill-sm";
    case "medium": return "ig-pill ig-pill-sm ig-pill-solid-yellow";
    case "low": return "ig-pill ig-pill-sm ig-pill-solid-blue";
    case "lowest": return "ig-pill ig-pill-sm ig-pill-solid-neutral";
    default: return "ig-pill ig-pill-sm ig-pill-neutral";
  }
}

function getPriorityStyle(priority: string): React.CSSProperties | undefined {
  if (priority === "high") return { background: "#FFF3E0", color: "#E65100" };
  return undefined;
}

export default function Home() {
  const { user, profile, canViewRequests, canManageSettings, effectiveRole, loading } = useAuth();
  const router = useRouter();

  const visibleCards = MODULE_CARDS.filter((c) => c.access(canViewRequests, canManageSettings));
  const [redirecting, setRedirecting] = React.useState(false);
  const [requests, setRequests] = React.useState<UxRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = React.useState(true);

  // If only 1 module accessible, skip splash and go directly
  useEffect(() => {
    if (!loading && visibleCards.length === 1 && !redirecting) {
      setRedirecting(true);
      router.replace(visibleCards[0].href);
    }
  }, [loading, visibleCards.length, redirecting, router]);

  // Load requests for the table
  useEffect(() => {
    if (loading || !user) return;
    async function load() {
      setLoadingRequests(true);
      let query = supabase.from("ux_requests").select("*").order("created_at", { ascending: false }).limit(10);

      if (effectiveRole === "requester") {
        // Requesters see their own
        query = query.eq("submitter_id", user!.id);
      } else {
        // Lead/Admin see active requests
        query = query.eq("status", "active");
      }

      const { data } = await query;
      setRequests(data ?? []);
      setLoadingRequests(false);
    }
    load();
  }, [loading, user, effectiveRole]);

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
    <main className="flex-1 py-8">
      <div className="ig-container space-y-16">
        {/* Modules */}
        <div>
          <h2 className="text-[18px] font-bold text-[var(--ig-fg1)] mb-4">Your modules</h2>
          <div className={`grid gap-4 ${visibleCards.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
            {visibleCards.map((c) => (
              <Link key={c.key} href={c.href}>
                <div className="ig-card ig-card-hover h-full flex flex-col overflow-hidden" style={{ padding: 0 }}>
                  <div className="px-5 pt-5 pb-4" style={{ background: c.gradient }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: c.iconBg }}>
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

        {/* Requests Table */}
        <div>
          <h2 className="text-[18px] font-bold text-[var(--ig-fg1)] mb-4">
            {effectiveRole === "requester" ? "My requests" : "Current requests"}
          </h2>

          {loadingRequests ? (
            <div className="text-center py-12 text-[var(--ig-fg3)] text-[13px]">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="ig-card text-center" style={{ padding: 32 }}>
              <p className="text-[13px] text-[var(--ig-fg3)]">
                {effectiveRole === "requester" ? "You haven't submitted any requests yet." : "No active requests."}
              </p>
            </div>
          ) : (
            <div className="ig-card overflow-hidden" style={{ padding: 0 }}>
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--ig-border)" }}>
                    <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--ig-fg3)" }}>Feature</th>
                    <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--ig-fg3)" }}>Product</th>
                    <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--ig-fg3)" }}>Priority</th>
                    <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--ig-fg3)" }}>Requester</th>
                    <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--ig-fg3)" }}>Jira</th>
                    <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--ig-fg3)" }}>Date</th>
                    {effectiveRole !== "requester" && (
                      <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--ig-fg3)" }}>Status</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr
                      key={req.id}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: "1px solid var(--ig-border)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ig-surface-raised)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      onClick={() => router.push("/dashboard")}
                    >
                      <td className="px-4 py-3 font-medium text-[var(--ig-fg1)]">{req.feature_name}</td>
                      <td className="px-4 py-3 text-[var(--ig-fg2)]">{req.product_name}</td>
                      <td className="px-4 py-3">
                        <span className={getPriorityPillClass(req.priority)} style={getPriorityStyle(req.priority)}>
                          {PRIORITY_OPTIONS.find((p) => p.value === req.priority)?.label ?? req.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--ig-fg2)]">{req.requester_name}</td>
                      <td className="px-4 py-3 text-[var(--ig-fg3)] font-mono text-[12px]">{req.jira_ticket_key}</td>
                      <td className="px-4 py-3 text-[var(--ig-fg3)]">
                        {new Date(req.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      {effectiveRole !== "requester" && (
                        <td className="px-4 py-3">
                          <span className="ig-pill ig-pill-sm ig-pill-blue">Active</span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
