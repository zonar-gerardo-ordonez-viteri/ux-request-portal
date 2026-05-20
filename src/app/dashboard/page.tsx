"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { PRIORITY_OPTIONS, type UxRequest, type AutocompleteOption } from "@/lib/types";
import { Combobox } from "@/components/combobox";
import { ExternalLink, X, Image as ImageIcon, Loader2, CheckCircle2, Pencil, Save, ChevronDown, Check, RotateCcw } from "lucide-react";
import Link from "next/link";

const FILTER_FIELDS = [
  { key: "product_name", label: "Product" },
  { key: "feature_name", label: "Feature" },
  { key: "pm_name", label: "PM" },
  { key: "lead_name", label: "Lead" },
  { key: "requester_name", label: "Requester" },
] as const;

type FilterKey = (typeof FILTER_FIELDS)[number]["key"];

type Tab = "active" | "processed";

function getPriorityLabel(priority: string) {
  return PRIORITY_OPTIONS.find((p) => p.value === priority)?.label ?? priority;
}

function getPriorityPillClass(priority: string): string {
  switch (priority) {
    case "highest": return "ig-pill ig-pill-red";
    case "high": return "ig-pill ig-pill-orange";
    case "medium": return "ig-pill ig-pill-yellow";
    case "low": return "ig-pill ig-pill-blue";
    case "lowest": return "ig-pill ig-pill-neutral";
    default: return "ig-pill ig-pill-neutral";
  }
}

export default function DashboardPage() {
  const { user, canViewRequests, canManageSettings, loading: authLoading } = useAuth();
  const [requests, setRequests] = React.useState<UxRequest[]>([]);
  const [options, setOptions] = React.useState<AutocompleteOption[]>([]);
  const [filters, setFilters] = React.useState<Record<FilterKey, string>>({
    product_name: "",
    feature_name: "",
    pm_name: "",
    lead_name: "",
    requester_name: "",
  });
  const [selectedRequest, setSelectedRequest] = React.useState<UxRequest | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<Tab>("active");
  const [editing, setEditing] = React.useState(false);
  const [editForm, setEditForm] = React.useState<Partial<UxRequest>>({});

  React.useEffect(() => {
    if (!authLoading) loadData();
  }, [authLoading]);

  async function loadData() {
    setLoading(true);
    const [reqResult, optResult] = await Promise.all([
      supabase.from("ux_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("autocomplete_options").select("*").order("value"),
    ]);
    if (reqResult.data) setRequests(reqResult.data);
    if (optResult.data) setOptions(optResult.data);
    setLoading(false);
  }

  function getOptionsForField(field: string): string[] {
    // First try autocomplete_options, then fall back to unique values from requests
    const fromOptions = options.filter((o) => o.field_name === field).map((o) => o.value);
    if (fromOptions.length > 0) return fromOptions;
    const key = field as keyof UxRequest;
    const unique = [...new Set(requests.map((r) => r[key] as string).filter(Boolean))];
    return unique.sort();
  }

  const filteredRequests = requests.filter((req) => {
    // Tab filter
    if (activeTab === "active") {
      if (req.status === "completed") return false;
    } else {
      if (req.status !== "completed") return false;
    }
    // Field filters
    for (const { key } of FILTER_FIELDS) {
      if (filters[key] && req[key] !== filters[key]) return false;
    }
    return true;
  });

  const hasActiveFilters = Object.values(filters).some(Boolean);

  function clearFilters() {
    setFilters({ product_name: "", feature_name: "", pm_name: "", lead_name: "", requester_name: "" });
  }

  async function markAsCompleted() {
    if (!selectedRequest) return;
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("ux_requests").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by: session?.user?.id ?? null,
    }).eq("id", selectedRequest.id);
    setRequests(prev => prev.map(r => r.id === selectedRequest.id ? { ...r, status: "completed" } : r));
    setSelectedRequest(null);
  }

  async function reactivateRequest() {
    if (!selectedRequest) return;
    await supabase.from("ux_requests").update({
      status: "active",
      completed_at: null,
      completed_by: null,
    }).eq("id", selectedRequest.id);
    setRequests(prev => prev.map(r => r.id === selectedRequest.id ? { ...r, status: "active", completed_at: null, completed_by: null } : r));
    setSelectedRequest(null);
  }

  function canEditRequest(req: UxRequest): boolean {
    if (canManageSettings) return true;
    if (user && req.submitter_id === user.id) return true;
    return false;
  }

  function startEditing() {
    if (!selectedRequest) return;
    setEditForm({
      product_name: selectedRequest.product_name,
      feature_name: selectedRequest.feature_name,
      pm_name: selectedRequest.pm_name,
      lead_name: selectedRequest.lead_name,
      requester_name: selectedRequest.requester_name,
      jira_ticket_key: selectedRequest.jira_ticket_key,
      priority: selectedRequest.priority,
      primary_user: selectedRequest.primary_user,
      feature_purpose: selectedRequest.feature_purpose,
      problem_description: selectedRequest.problem_description,
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!selectedRequest) return;
    const { error } = await supabase.from("ux_requests").update(editForm).eq("id", selectedRequest.id);
    if (error) { alert(error.message); return; }
    const updated = { ...selectedRequest, ...editForm };
    setRequests(prev => prev.map(r => r.id === selectedRequest.id ? updated as UxRequest : r));
    setSelectedRequest(updated as UxRequest);
    setEditing(false);
  }

  if (authLoading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--ig-fg3)" }} />
      </main>
    );
  }

  if (!canViewRequests) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="ig-card max-w-md w-full text-center p-8">
          <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--ig-fg1)" }}>Access Denied</h2>
          <p className="mb-4" style={{ color: "var(--ig-fg3)" }}>You need Lead or Admin access to view requests.</p>
          <Link href="/">
            <button className="ig-btn ig-btn-md ig-btn-primary">Go Home</button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col py-8">
      <div className="ig-container space-y-6">
        <div className="space-y-1">
          <Link
            href="/"
            className="text-sm transition-colors hover:opacity-80 inline-block"
            style={{ color: "var(--ig-fg3)", marginBottom: 24 }}
          >
            &larr; Back
          </Link>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--ig-fg1)" }}>
            Request Dashboard
          </h1>
          <p style={{ color: "var(--ig-fg3)" }}>
            {filteredRequests.length} request{filteredRequests.length !== 1 ? "s" : ""}
            {hasActiveFilters ? " (filtered)" : ""}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: "var(--ig-border)" }}>
          <button
            onClick={() => setActiveTab("active")}
            className="px-4 py-2 text-[13px] font-medium -mb-px border-b-2 transition-colors"
            style={
              activeTab === "active"
                ? { borderColor: "var(--ig-primary)", color: "var(--ig-primary)" }
                : { borderColor: "transparent", color: "var(--ig-fg3)" }
            }
          >
            Active requests
          </button>
          <button
            onClick={() => setActiveTab("processed")}
            className="px-4 py-2 text-[13px] font-medium -mb-px border-b-2 transition-colors"
            style={
              activeTab === "processed"
                ? { borderColor: "var(--ig-primary)", color: "var(--ig-primary)" }
                : { borderColor: "transparent", color: "var(--ig-fg3)" }
            }
          >
            Processed requests
          </button>
        </div>

        {/* Filters */}
        <div className="ig-card">
          <div className="p-4">
            <div className="flex items-end gap-3 flex-wrap">
              {FILTER_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1 min-w-[160px] flex-1">
                  <label className="ig-label" style={{ color: "var(--ig-fg3)" }}>{f.label}</label>
                  <Combobox
                    options={getOptionsForField(f.key)}
                    value={filters[f.key]}
                    onChange={(val) => setFilters((prev) => ({ ...prev, [f.key]: val }))}
                    placeholder={`All ${f.label}s`}
                  />
                </div>
              ))}
              {hasActiveFilters && (
                <button className="ig-btn ig-btn-sm ig-btn-ghost" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1 inline-block" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Request List */}
        {loading ? (
          <div className="text-center py-16" style={{ color: "var(--ig-fg3)" }}>Loading requests...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-16" style={{ color: "var(--ig-fg3)" }}>
            {hasActiveFilters ? "No requests match your filters." : activeTab === "active" ? "No active requests." : "No processed requests."}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="ig-card ig-card-hover"
                onClick={() => setSelectedRequest(req)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate" style={{ color: "var(--ig-fg1)" }}>
                          {req.feature_name}
                        </h3>
                        <span
                          className={getPriorityPillClass(req.priority)}
                        >
                          {getPriorityLabel(req.priority)}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: "var(--ig-fg3)" }}>
                        {req.product_name} &middot; {req.requester_name} &middot;{" "}
                        {new Date(req.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {activeTab === "processed" && (
                          <>
                            {" "}
                            <span className="ig-pill ig-pill-sm ig-pill-green">Completed</span>
                          </>
                        )}
                      </p>
                      <p className="text-sm mt-1 line-clamp-2" style={{ color: "var(--ig-fg2)" }}>
                        {req.problem_description}
                      </p>
                    </div>
                    <div className="text-right text-xs shrink-0" style={{ color: "var(--ig-fg3)" }}>
                      <div>{req.jira_ticket_key}</div>
                      {req.attachments?.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          <ImageIcon className="h-3 w-3" />
                          {req.attachments.length}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail Dialog */}
        {selectedRequest && (
          <>
            <div className="ig-overlay" onClick={() => { setSelectedRequest(null); setEditing(false); }} />
            <div className="ig-dialog ig-dialog-lg">
              <div className="max-h-[85vh] overflow-y-auto">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold" style={{ color: "var(--ig-fg1)" }}>
                      {editing ? "Edit request" : selectedRequest.feature_name}
                    </h2>
                    {!editing && <span className={getPriorityPillClass(selectedRequest.priority)}>{getPriorityLabel(selectedRequest.priority)}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    {!editing && canEditRequest(selectedRequest) && selectedRequest.status !== "completed" && (
                      <button className="ig-iconbtn" onClick={startEditing}><Pencil className="w-4 h-4" /></button>
                    )}
                    <button className="ig-iconbtn" onClick={() => { setSelectedRequest(null); setEditing(false); }}><X className="w-4 h-4" /></button>
                  </div>
                </div>

                {editing ? (
                  <div className="space-y-3 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                      {([["product_name","Product"],["feature_name","Feature"],["pm_name","PM"],["lead_name","Lead"],["requester_name","Requester"],["jira_ticket_key","Jira Ticket"]] as const).map(([key,label]) => (
                        <div key={key} className="space-y-1">
                          <label className="ig-label">{label}</label>
                          <div className="ig-input"><input value={(editForm as Record<string,string>)[key] || ""} onChange={(e) => setEditForm(p => ({ ...p, [key]: e.target.value }))} /></div>
                        </div>
                      ))}
                      <div className="space-y-1">
                        <label className="ig-label">Priority</label>
                        <div className="ig-input"><select value={editForm.priority || ""} onChange={(e) => setEditForm(p => ({ ...p, priority: e.target.value as UxRequest["priority"] }))}>{PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
                      </div>
                      <div className="space-y-1">
                        <label className="ig-label">Primary User</label>
                        <div className="ig-input"><input value={editForm.primary_user || ""} onChange={(e) => setEditForm(p => ({ ...p, primary_user: e.target.value }))} /></div>
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
                      <button className="ig-btn ig-btn-md ig-btn-primary flex-1" onClick={saveEdit}><Save className="w-4 h-4" /> Save changes</button>
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
                      {selectedRequest.attachments?.length > 0 && (
                        <><div className="ig-sep" /><div><span className="text-sm" style={{ color: "var(--ig-fg3)" }}>Attachments</span><div className="grid grid-cols-2 gap-2 mt-2">{selectedRequest.attachments.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-md overflow-hidden transition-colors" style={{ border: "1px solid var(--ig-border)" }}>
                            {url.match(/\.(mp4|webm|mov)$/i) ? (<div className="flex items-center justify-center h-24" style={{ background: "var(--ig-surface)" }}><ExternalLink className="h-5 w-5" style={{ color: "var(--ig-fg3)" }} /><span className="ml-2 text-sm" style={{ color: "var(--ig-fg3)" }}>Video</span></div>) : (<img src={url} alt={`Attachment ${i + 1}`} className="w-full h-32 object-cover" />)}
                          </a>))}</div></div></>
                      )}
                      {canManageSettings && (
                        <><div className="ig-sep" />
                        {selectedRequest.status !== "completed" ? (
                          <button className="ig-btn ig-btn-md ig-btn-primary w-full" onClick={markAsCompleted}><CheckCircle2 className="w-4 h-4" /> Mark as completed</button>
                        ) : (
                          <button className="ig-btn ig-btn-md ig-btn-secondary w-full" onClick={reactivateRequest}><RotateCcw className="w-4 h-4" /> Reactivate request</button>
                        )}</>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
