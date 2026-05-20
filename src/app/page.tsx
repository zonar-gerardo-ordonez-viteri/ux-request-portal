"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Combobox } from "@/components/combobox";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PRIORITY_OPTIONS, type UxRequest } from "@/lib/types";
import { Loader2, Send, LayoutList, Settings, X, Pencil, Save, Trash2 } from "lucide-react";

const MODULE_CARDS = [
  {
    key: "request", href: "/request", icon: Send,
    title: "Submit a request", desc: "Need UX guidance? Submit a detailed request so our design team can help.",
    gradient: "linear-gradient(135deg, rgba(0,91,248,0.25) 0%, rgba(0,174,239,0.15) 100%)",
    iconBg: "rgba(0,91,248,0.3)", iconColor: "#5B9AFF",
    access: () => true,
  },
  {
    key: "dashboard", href: "/dashboard", icon: LayoutList,
    title: "Request dashboard", desc: "View, filter, and manage all incoming UX requests.",
    gradient: "linear-gradient(135deg, rgba(132,0,255,0.25) 0%, rgba(0,91,248,0.15) 100%)",
    iconBg: "rgba(132,0,255,0.3)", iconColor: "#B47AFF",
    access: (canView: boolean) => canView,
  },
  {
    key: "settings", href: "/admin/settings", icon: Settings,
    title: "Settings", desc: "Manage users, allowed domains, and autocomplete options.",
    gradient: "linear-gradient(135deg, rgba(0,174,239,0.25) 0%, rgba(102,174,0,0.15) 100%)",
    iconBg: "rgba(0,174,239,0.3)", iconColor: "#33D6FF",
    access: (_: boolean, canManage: boolean) => canManage,
  },
];

function getPriorityPillClass(priority: string): string {
  switch (priority) {
    case "highest": return "ig-pill ig-pill-sm ig-pill-red";
    case "high": return "ig-pill ig-pill-sm ig-pill-orange";
    case "medium": return "ig-pill ig-pill-sm ig-pill-yellow";
    case "low": return "ig-pill ig-pill-sm ig-pill-blue";
    case "lowest": return "ig-pill ig-pill-sm ig-pill-neutral";
    default: return "ig-pill ig-pill-sm ig-pill-neutral";
  }
}

type Tab = "active" | "processed";

export default function Home() {
  const { user, profile, canViewRequests, canManageSettings, effectiveRole, loading } = useAuth();
  const router = useRouter();

  const visibleCards = MODULE_CARDS.filter((c) => c.access(canViewRequests, canManageSettings));
  const [requests, setRequests] = React.useState<UxRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = React.useState(true);
  const fetchedForUser = React.useRef<string | null>(null);
  const [selectedRequest, setSelectedRequest] = React.useState<UxRequest | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [editForm, setEditForm] = React.useState<Partial<UxRequest>>({});
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [tab, setTab] = React.useState<Tab>("active");
  const [filterProduct, setFilterProduct] = React.useState("");
  const [filterFeature, setFilterFeature] = React.useState("");
  const [filterPm, setFilterPm] = React.useState("");
  const [filterLead, setFilterLead] = React.useState("");
  const [filterRequester, setFilterRequester] = React.useState("");

  const userId = user?.id ?? null;
  useEffect(() => {
    if (loading || !userId || fetchedForUser.current === userId) return;
    fetchedForUser.current = userId;
    async function load() {
      setLoadingRequests(true);
      let query = supabase.from("ux_requests").select("*").order("created_at", { ascending: false });
      if (effectiveRole === "requester") {
        query = query.eq("submitter_id", userId);
      }
      const { data } = await query;
      setRequests(data ?? []);
      setLoadingRequests(false);
    }
    load();
  }, [loading, userId, effectiveRole]);

  // Filtered requests
  const filteredRequests = requests.filter((req) => {
    if (tab === "active" && req.status === "completed") return false;
    if (tab === "processed" && req.status !== "completed") return false;
    if (filterProduct && req.product_name !== filterProduct) return false;
    if (filterFeature && req.feature_name !== filterFeature) return false;
    if (filterPm && req.pm_name !== filterPm) return false;
    if (filterLead && req.lead_name !== filterLead) return false;
    if (filterRequester && req.requester_name !== filterRequester) return false;
    return true;
  });

  function uniqueValues(key: keyof UxRequest): string[] {
    return [...new Set(requests.map((r) => r[key] as string).filter(Boolean))].sort();
  }

  const hasFilters = !!(filterProduct || filterFeature || filterPm || filterLead || filterRequester);
  function clearFilters() { setFilterProduct(""); setFilterFeature(""); setFilterPm(""); setFilterLead(""); setFilterRequester(""); }

  function startEditing() {
    if (!selectedRequest) return;
    setEditForm({ product_name: selectedRequest.product_name, feature_name: selectedRequest.feature_name, pm_name: selectedRequest.pm_name, lead_name: selectedRequest.lead_name, requester_name: selectedRequest.requester_name, jira_ticket_key: selectedRequest.jira_ticket_key, priority: selectedRequest.priority, primary_user: selectedRequest.primary_user, feature_purpose: selectedRequest.feature_purpose, problem_description: selectedRequest.problem_description });
    setEditing(true);
  }

  async function saveEdit() {
    if (!selectedRequest) return;
    const { error } = await supabase.from("ux_requests").update(editForm).eq("id", selectedRequest.id);
    if (error) { alert(error.message); return; }
    const updated = { ...selectedRequest, ...editForm } as UxRequest;
    setRequests(prev => prev.map(r => r.id === selectedRequest.id ? updated : r));
    setSelectedRequest(updated);
    setEditing(false);
  }

  async function doDelete() {
    if (!selectedRequest) return;
    const { error } = await supabase.from("ux_requests").delete().eq("id", selectedRequest.id);
    if (error) { alert(error.message); return; }
    setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
    setSelectedRequest(null);
    setEditing(false);
    setConfirmDelete(false);
  }

  if (loading) {
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
          <div className={`grid gap-4 ${visibleCards.length === 1 ? "sm:grid-cols-1 max-w-sm" : visibleCards.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
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

        {/* Requests */}
        <div>
          <h2 className="text-[18px] font-bold text-[var(--ig-fg1)] mb-4">
            {effectiveRole === "requester" ? "My requests" : "Current requests"}
          </h2>

          {/* Tabs */}
          <div className="flex border-b mb-4" style={{ borderColor: "var(--ig-border)" }}>
            {(["active", "processed"] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="px-4 py-2 text-[13px] font-medium -mb-px border-b-2 transition-colors"
                style={tab === t ? { borderColor: "var(--ig-primary)", color: "var(--ig-primary)" } : { borderColor: "transparent", color: "var(--ig-fg3)" }}>
                {t === "active" ? "Active" : "Processed"}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-end gap-3 flex-wrap mb-4">
            <div className="space-y-1 min-w-[140px] flex-1">
              <label className="ig-label" style={{ color: "var(--ig-fg3)" }}>Product</label>
              <Combobox options={uniqueValues("product_name")} value={filterProduct} onChange={setFilterProduct} placeholder="All" />
            </div>
            <div className="space-y-1 min-w-[140px] flex-1">
              <label className="ig-label" style={{ color: "var(--ig-fg3)" }}>Feature</label>
              <Combobox options={uniqueValues("feature_name")} value={filterFeature} onChange={setFilterFeature} placeholder="All" />
            </div>
            {canViewRequests && (
              <>
                <div className="space-y-1 min-w-[140px] flex-1">
                  <label className="ig-label" style={{ color: "var(--ig-fg3)" }}>PM</label>
                  <Combobox options={uniqueValues("pm_name")} value={filterPm} onChange={setFilterPm} placeholder="All" />
                </div>
                <div className="space-y-1 min-w-[140px] flex-1">
                  <label className="ig-label" style={{ color: "var(--ig-fg3)" }}>Lead</label>
                  <Combobox options={uniqueValues("lead_name")} value={filterLead} onChange={setFilterLead} placeholder="All" />
                </div>
                <div className="space-y-1 min-w-[140px] flex-1">
                  <label className="ig-label" style={{ color: "var(--ig-fg3)" }}>Requester</label>
                  <Combobox options={uniqueValues("requester_name")} value={filterRequester} onChange={setFilterRequester} placeholder="All" />
                </div>
              </>
            )}
            {hasFilters && (
              <button className="ig-btn ig-btn-sm ig-btn-ghost" onClick={clearFilters}><X className="w-3.5 h-3.5" /> Clear</button>
            )}
          </div>

          {/* Table */}
          {loadingRequests ? (
            <div className="text-center py-12 text-[var(--ig-fg3)] text-[13px]">Loading...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="ig-card text-center" style={{ padding: 32 }}>
              <p className="text-[13px] text-[var(--ig-fg3)]">
                {hasFilters ? "No requests match your filters." : tab === "active" ? (effectiveRole === "requester" ? "No active requests." : "No active requests.") : "No processed requests."}
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
                    {canViewRequests && <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--ig-fg3)" }}>Requester</th>}
                    <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--ig-fg3)" }}>Jira</th>
                    <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--ig-fg3)" }}>Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--ig-fg3)" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="cursor-pointer transition-colors"
                      style={{ borderBottom: "1px solid var(--ig-border)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ig-surface-raised)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      onClick={() => effectiveRole === "requester" ? setSelectedRequest(req) : router.push("/dashboard")}>
                      <td className="px-4 py-3 font-medium text-[var(--ig-fg1)]">{req.feature_name}</td>
                      <td className="px-4 py-3 text-[var(--ig-fg2)]">{req.product_name}</td>
                      <td className="px-4 py-3">
                        <span className={getPriorityPillClass(req.priority)}>
                          {PRIORITY_OPTIONS.find((p) => p.value === req.priority)?.label ?? req.priority}
                        </span>
                      </td>
                      {canViewRequests && <td className="px-4 py-3 text-[var(--ig-fg2)]">{req.requester_name}</td>}
                      <td className="px-4 py-3 text-[var(--ig-fg3)] font-mono text-[12px]">{req.jira_ticket_key}</td>
                      <td className="px-4 py-3 text-[var(--ig-fg3)]">
                        {new Date(req.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`ig-pill ig-pill-sm ${req.status === "completed" ? "ig-pill-green" : "ig-pill-blue"}`}>
                          {req.status === "completed" ? "Completed" : "Active"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Request detail dialog */}
      {selectedRequest && (
        <>
          <div className="ig-overlay" onClick={() => { setSelectedRequest(null); setEditing(false); }} />
          <div className="ig-dialog ig-dialog-lg">
            <div className="max-h-[85vh] overflow-y-auto p-6">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold" style={{ color: "var(--ig-fg1)" }}>
                    {editing ? "Edit request" : selectedRequest.feature_name}
                  </h2>
                  {!editing && <span className={getPriorityPillClass(selectedRequest.priority)}>{PRIORITY_OPTIONS.find(p => p.value === selectedRequest.priority)?.label}</span>}
                </div>
                <div className="flex items-center gap-1">
                  {!editing && selectedRequest.status !== "completed" && <button className="ig-btn ig-btn-sm ig-btn-ghost" onClick={startEditing}><Pencil className="w-3.5 h-3.5" /></button>}
                  <button className="ig-btn ig-btn-sm ig-btn-ghost" onClick={() => { setSelectedRequest(null); setEditing(false); }}><X className="h-4 w-4" /></button>
                </div>
              </div>

              {editing ? (
                <div className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {([["product_name","Product"],["feature_name","Feature"],["pm_name","PM"],["lead_name","Lead"],["requester_name","Requester"],["jira_ticket_key","Jira Ticket"],["primary_user","Primary User"]] as const).map(([key,label]) => (
                      <div key={key} className="space-y-1">
                        <label className="ig-label">{label}</label>
                        <div className="ig-input"><input value={(editForm as Record<string,string>)[key] || ""} onChange={(e) => setEditForm(p => ({ ...p, [key]: e.target.value }))} /></div>
                      </div>
                    ))}
                    <div className="space-y-1">
                      <label className="ig-label">Priority</label>
                      <div className="ig-input"><select value={editForm.priority || ""} onChange={(e) => setEditForm(p => ({ ...p, priority: e.target.value as UxRequest["priority"] }))}>{PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="ig-label">Feature Purpose</label>
                    <textarea className="ig-textarea" rows={3} value={editForm.feature_purpose || ""} onChange={(e) => setEditForm(p => ({ ...p, feature_purpose: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="ig-label">Problem Description</label>
                    <textarea className="ig-textarea" rows={5} value={editForm.problem_description || ""} onChange={(e) => setEditForm(p => ({ ...p, problem_description: e.target.value }))} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button className="ig-btn ig-btn-md ig-btn-primary flex-1" onClick={saveEdit}><Save className="w-4 h-4" /> Save</button>
                    <button className="ig-btn ig-btn-md ig-btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm mb-4" style={{ color: "var(--ig-fg3)" }}>
                    Submitted on {new Date(selectedRequest.created_at).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {([["Product",selectedRequest.product_name],["Feature",selectedRequest.feature_name],["PM",selectedRequest.pm_name],["Lead",selectedRequest.lead_name],["Requester",selectedRequest.requester_name],["Jira Ticket",selectedRequest.jira_ticket_key]] as const).map(([label,value]) => (
                        <div key={label}><span style={{ color: "var(--ig-fg3)" }}>{label}</span><p className="font-medium" style={{ color: "var(--ig-fg1)" }}>{value}</p></div>
                      ))}
                    </div>
                    <div className="ig-sep" />
                    <div className="text-sm"><span style={{ color: "var(--ig-fg3)" }}>Primary User</span><p className="font-medium" style={{ color: "var(--ig-fg1)" }}>{selectedRequest.primary_user}</p></div>
                    <div className="text-sm"><span style={{ color: "var(--ig-fg3)" }}>Feature Purpose</span><p className="mt-1 whitespace-pre-wrap" style={{ color: "var(--ig-fg2)" }}>{selectedRequest.feature_purpose}</p></div>
                    <div className="ig-sep" />
                    <div className="text-sm"><span style={{ color: "var(--ig-fg3)" }}>Problem Description</span><p className="mt-1 whitespace-pre-wrap" style={{ color: "var(--ig-fg2)" }}>{selectedRequest.problem_description}</p></div>
                    <div className="ig-sep" />
                    <button className="ig-btn ig-btn-md ig-btn-danger w-full" onClick={() => setConfirmDelete(true)}><Trash2 className="w-4 h-4" /> Delete request</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete request"
        message={`Are you sure you want to delete "${selectedRequest?.feature_name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </main>
  );
}
