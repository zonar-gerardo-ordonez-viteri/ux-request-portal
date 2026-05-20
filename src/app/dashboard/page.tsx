"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { PRIORITY_OPTIONS, type UxRequest, type AutocompleteOption } from "@/lib/types";
import { Combobox } from "@/components/combobox";
import { ExternalLink, X, Image as ImageIcon, Loader2 } from "lucide-react";
import Link from "next/link";

const FILTER_FIELDS = [
  { key: "product_name", label: "Product" },
  { key: "feature_name", label: "Feature" },
  { key: "pm_name", label: "PM" },
  { key: "lead_name", label: "Lead" },
  { key: "requester_name", label: "Requester" },
] as const;

type FilterKey = (typeof FILTER_FIELDS)[number]["key"];

function getPriorityLabel(priority: string) {
  return PRIORITY_OPTIONS.find((p) => p.value === priority)?.label ?? priority;
}

function getPriorityPillClass(priority: string): string {
  switch (priority) {
    case "highest":
      return "ig-pill ig-pill-solid-red";
    case "medium":
      return "ig-pill ig-pill-solid-yellow";
    case "low":
      return "ig-pill ig-pill-solid-blue";
    case "lowest":
      return "ig-pill ig-pill-solid-neutral";
    default:
      return "ig-pill";
  }
}

function getPriorityPillStyle(priority: string): React.CSSProperties | undefined {
  if (priority === "high") {
    return { background: "#FFF3E0", color: "#E65100" };
  }
  return undefined;
}

export default function DashboardPage() {
  const { canViewRequests, loading: authLoading } = useAuth();
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
    return options.filter((o) => o.field_name === field).map((o) => o.value);
  }

  const filteredRequests = requests.filter((req) => {
    for (const { key } of FILTER_FIELDS) {
      if (filters[key] && req[key] !== filters[key]) return false;
    }
    return true;
  });

  const hasActiveFilters = Object.values(filters).some(Boolean);

  function clearFilters() {
    setFilters({ product_name: "", feature_name: "", pm_name: "", lead_name: "", requester_name: "" });
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
    <main className="flex-1 flex flex-col p-6">
      <div className="ig-container px-6 space-y-6">
        <div className="space-y-1">
          <Link
            href="/"
            className="text-sm transition-colors hover:opacity-80"
            style={{ color: "var(--ig-fg3)" }}
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
            {hasActiveFilters ? "No requests match your filters." : "No requests yet."}
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
                          style={getPriorityPillStyle(req.priority)}
                        >
                          {getPriorityLabel(req.priority)}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: "var(--ig-fg3)" }}>
                        {req.product_name} &middot; {req.requester_name} &middot;{" "}
                        {new Date(req.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
            <div className="ig-overlay" onClick={() => setSelectedRequest(null)} />
            <div className="ig-dialog ig-dialog-lg">
              <div className="max-h-[85vh] overflow-y-auto p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold" style={{ color: "var(--ig-fg1)" }}>
                      {selectedRequest.feature_name}
                    </h2>
                    <span
                      className={getPriorityPillClass(selectedRequest.priority)}
                      style={getPriorityPillStyle(selectedRequest.priority)}
                    >
                      {getPriorityLabel(selectedRequest.priority)}
                    </span>
                  </div>
                  <button
                    className="ig-btn ig-btn-sm ig-btn-ghost"
                    onClick={() => setSelectedRequest(null)}
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm mb-4" style={{ color: "var(--ig-fg3)" }}>
                  Submitted on{" "}
                  {new Date(selectedRequest.created_at).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>

                {/* Details Grid */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span style={{ color: "var(--ig-fg3)" }}>Product</span>
                      <p className="font-medium" style={{ color: "var(--ig-fg1)" }}>
                        {selectedRequest.product_name}
                      </p>
                    </div>
                    <div>
                      <span style={{ color: "var(--ig-fg3)" }}>Feature</span>
                      <p className="font-medium" style={{ color: "var(--ig-fg1)" }}>
                        {selectedRequest.feature_name}
                      </p>
                    </div>
                    <div>
                      <span style={{ color: "var(--ig-fg3)" }}>PM</span>
                      <p className="font-medium" style={{ color: "var(--ig-fg1)" }}>
                        {selectedRequest.pm_name}
                      </p>
                    </div>
                    <div>
                      <span style={{ color: "var(--ig-fg3)" }}>Lead</span>
                      <p className="font-medium" style={{ color: "var(--ig-fg1)" }}>
                        {selectedRequest.lead_name}
                      </p>
                    </div>
                    <div>
                      <span style={{ color: "var(--ig-fg3)" }}>Requester</span>
                      <p className="font-medium" style={{ color: "var(--ig-fg1)" }}>
                        {selectedRequest.requester_name}
                      </p>
                    </div>
                    <div>
                      <span style={{ color: "var(--ig-fg3)" }}>Jira Ticket</span>
                      <p className="font-medium" style={{ color: "var(--ig-fg1)" }}>
                        {selectedRequest.jira_ticket_key}
                      </p>
                    </div>
                  </div>

                  <div className="ig-sep" />

                  <div className="text-sm">
                    <span style={{ color: "var(--ig-fg3)" }}>Primary User</span>
                    <p className="font-medium" style={{ color: "var(--ig-fg1)" }}>
                      {selectedRequest.primary_user}
                    </p>
                  </div>

                  <div className="text-sm">
                    <span style={{ color: "var(--ig-fg3)" }}>Feature Purpose</span>
                    <p className="mt-1 whitespace-pre-wrap" style={{ color: "var(--ig-fg2)" }}>
                      {selectedRequest.feature_purpose}
                    </p>
                  </div>

                  <div className="ig-sep" />

                  <div className="text-sm">
                    <span style={{ color: "var(--ig-fg3)" }}>Problem Description</span>
                    <p className="mt-1 whitespace-pre-wrap" style={{ color: "var(--ig-fg2)" }}>
                      {selectedRequest.problem_description}
                    </p>
                  </div>

                  {selectedRequest.attachments?.length > 0 && (
                    <>
                      <div className="ig-sep" />
                      <div>
                        <span className="text-sm" style={{ color: "var(--ig-fg3)" }}>Attachments</span>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {selectedRequest.attachments.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded-md overflow-hidden transition-colors"
                              style={{ border: "1px solid var(--ig-border)" }}
                            >
                              {url.match(/\.(mp4|webm|mov)$/i) ? (
                                <div
                                  className="flex items-center justify-center h-24"
                                  style={{ background: "var(--ig-surface)" }}
                                >
                                  <ExternalLink className="h-5 w-5" style={{ color: "var(--ig-fg3)" }} />
                                  <span className="ml-2 text-sm" style={{ color: "var(--ig-fg3)" }}>
                                    Video
                                  </span>
                                </div>
                              ) : (
                                <img
                                  src={url}
                                  alt={`Attachment ${i + 1}`}
                                  className="w-full h-32 object-cover"
                                />
                              )}
                            </a>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
