"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { UxRequest } from "@/lib/types";
import { DatePicker } from "@/components/date-picker";
import { Loader2, ArrowLeft, FileText, CheckCircle2, Clock, TrendingUp, Calendar, BarChart3, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Modal, ModalActions } from "@/components/modal";
import { FilterButton, FilterOption } from "@/components/filter-button";
import Link from "next/link";

type Preset = "30" | "60" | "90" | "custom";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DashboardPage() {
  const { canViewRequests, loading: authLoading } = useAuth();
  const [requests, setRequests] = React.useState<UxRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [preset, setPreset] = React.useState<Preset | null>(null);
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo] = React.useState("");
  const [customModalOpen, setCustomModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (!authLoading) loadData();
  }, [authLoading]);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase.from("ux_requests").select("*").order("created_at", { ascending: false });
    setRequests(data ?? []);
    setLoading(false);
  }

  // Date range
  const dateFrom = preset === "custom" ? customFrom : preset ? daysAgo(parseInt(preset)) : "";
  const dateTo = preset === "custom" ? customTo : preset ? new Date().toISOString().split("T")[0] : "";

  const filtered = requests.filter((r) => {
    const d = r.created_at.split("T")[0];
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  });

  const totalRequests = filtered.length;
  const completedRequests = filtered.filter((r) => r.status === "completed").length;
  const activeRequests = totalRequests - completedRequests;
  const completionRate = totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0;

  // By product
  const byProduct: Record<string, { total: number; completed: number }> = {};
  for (const r of filtered) {
    const p = r.product_name || "Unknown";
    if (!byProduct[p]) byProduct[p] = { total: 0, completed: 0 };
    byProduct[p].total++;
    if (r.status === "completed") byProduct[p].completed++;
  }
  const productRows = Object.entries(byProduct).sort((a, b) => b[1].total - a[1].total);
  const maxProductTotal = productRows.length > 0 ? productRows[0][1].total : 1;

  // Top requesters
  const byRequester: Record<string, number> = {};
  for (const r of filtered) {
    const name = r.requester_name || "Unknown";
    byRequester[name] = (byRequester[name] || 0) + 1;
  }
  const requesterRows = Object.entries(byRequester).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxRequesterCount = requesterRows.length > 0 ? requesterRows[0][1] : 1;

  if (authLoading || loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--ig-fg3)" }} />
      </main>
    );
  }

  if (!canViewRequests) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="ig-card max-w-md w-full text-center" style={{ padding: 32 }}>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--ig-fg1)" }}>Access denied</h2>
          <p className="mb-4" style={{ color: "var(--ig-fg3)" }}>Lead or Admin access required.</p>
          <Link href="/"><button className="ig-btn ig-btn-md ig-btn-primary">Go home</button></Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col py-8">
      <div className="ig-container space-y-8">
        {/* Header + Date filter */}
        <div>
          <Link href="/" className="text-[13px] text-[var(--ig-fg3)] hover:text-[var(--ig-fg1)] transition-colors inline-flex items-center gap-1" style={{ marginBottom: 24, display: "inline-block" }}>
            <ArrowLeft className="w-3 h-3 inline" /> Back
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold" style={{ color: "var(--ig-fg1)" }}>Dashboard</h1>
            <FilterButton
              icon={<Calendar className="w-4 h-4" />}
              label="Filter by date"
              activeLabel={preset === "custom" ? (customFrom && customTo ? `${formatDate(customFrom)} — ${formatDate(customTo)}` : "Custom range") : preset ? `Last ${preset} days` : undefined}
              active={!!preset}
              onClear={() => { setPreset(null); setCustomFrom(""); setCustomTo(""); }}
            >
              {(["30", "60", "90"] as Preset[]).map((p) => (
                <FilterOption key={p} label={`Last ${p} days`} onClick={() => setPreset(p)} />
              ))}
              <div className="ig-sep my-1" />
              <FilterOption label="Custom range..." onClick={() => setCustomModalOpen(true)} />
            </FilterButton>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total requests", value: totalRequests, icon: FileText, color: "var(--ig-primary)", bg: "rgba(0,91,248,0.15)" },
            { label: "Completed", value: completedRequests, icon: CheckCircle2, color: "#66BB6A", bg: "rgba(46,125,50,0.15)" },
            { label: "Active", value: activeRequests, icon: Clock, color: "#FFB74D", bg: "rgba(255,179,0,0.15)" },
            { label: "Completion rate", value: `${completionRate}%`, icon: TrendingUp, color: "#5B9AFF", bg: "rgba(0,91,248,0.10)" },
          ].map((s) => (
            <div key={s.label} className="ig-card" style={{ padding: 20 }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: s.bg }}>
                  <s.icon className="w-[18px] h-[18px]" style={{ color: s.color }} />
                </div>
                <span className="text-[12px] font-medium" style={{ color: "var(--ig-fg3)" }}>{s.label}</span>
              </div>
              <p className="text-[28px] font-bold" style={{ color: "var(--ig-fg1)" }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Requests by product */}
          <div className="ig-card" style={{ padding: 24 }}>
            <h3 className="text-[15px] font-semibold mb-4" style={{ color: "var(--ig-fg1)" }}>Requests by product</h3>
            {productRows.length === 0 ? (
              <EmptyState icon={BarChart3} title="No data yet" description="Request data will appear here as requests are submitted." />
            ) : (
              <div className="space-y-3">
                {productRows.map(([name, data]) => (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-medium" style={{ color: "var(--ig-fg1)" }}>{name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px]" style={{ color: "var(--ig-fg3)" }}>{data.completed}/{data.total}</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--ig-surface-raised)" }}>
                      <div className="h-full rounded-full flex">
                        <div className="h-full rounded-full" style={{
                          width: `${(data.completed / maxProductTotal) * 100}%`,
                          background: "#66BB6A",
                        }} />
                        <div className="h-full" style={{
                          width: `${((data.total - data.completed) / maxProductTotal) * 100}%`,
                          background: "var(--ig-primary)",
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--ig-primary)" }} />
                    <span className="text-[11px]" style={{ color: "var(--ig-fg3)" }}>Active</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#66BB6A" }} />
                    <span className="text-[11px]" style={{ color: "var(--ig-fg3)" }}>Completed</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Top requesters */}
          <div className="ig-card" style={{ padding: 24 }}>
            <h3 className="text-[15px] font-semibold mb-4" style={{ color: "var(--ig-fg1)" }}>Top requesters</h3>
            {requesterRows.length === 0 ? (
              <EmptyState icon={Users} title="No requesters yet" description="Requester rankings will appear as requests are submitted." />
            ) : (
              <div>
                {requesterRows.map(([name, count], i) => (
                  <div key={name} className="flex items-center justify-between py-3" style={{ borderBottom: i < requesterRows.length - 1 ? "1px solid var(--ig-border)" : "none" }}>
                    <span className="text-[13px] font-medium truncate" style={{ color: "var(--ig-fg1)" }}>
                      <span className="text-[12px] mr-2" style={{ color: "var(--ig-fg3)" }}>{i + 1}.</span>
                      {name}
                    </span>
                    <span className="ig-pill ig-pill-sm ig-pill-neutral shrink-0 ml-2">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={customModalOpen} onClose={() => setCustomModalOpen(false)} title="Custom date range" size="sm">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="ig-label">From</label>
            <DatePicker value={customFrom} onChange={setCustomFrom} placeholder="Start date" />
          </div>
          <div className="space-y-1">
            <label className="ig-label">To</label>
            <DatePicker value={customTo} onChange={setCustomTo} placeholder="End date" />
          </div>
        </div>
        <ModalActions>
          <button
            className="ig-btn ig-btn-md ig-btn-primary w-full"
            disabled={!customFrom || !customTo}
            onClick={() => { setPreset("custom"); setCustomModalOpen(false); }}
          >
            Apply range
          </button>
        </ModalActions>
      </Modal>
    </main>
  );
}
