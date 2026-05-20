"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { PRIORITY_OPTIONS, type UxRequest, type AutocompleteOption } from "@/lib/types";
import { Combobox } from "@/components/combobox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

function getPriorityConfig(priority: string) {
  return PRIORITY_OPTIONS.find((p) => p.value === priority) ?? { label: priority, color: "bg-slate-400" };
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!canViewRequests) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center p-8">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You need Lead or Admin access to view requests.</p>
          <Link href="/"><Button>Go Home</Button></Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-6">
      <div className="max-w-6xl w-full mx-auto space-y-6">
        <div className="space-y-1">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            &larr; Back
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Request Dashboard</h1>
          <p className="text-muted-foreground">
            {filteredRequests.length} request{filteredRequests.length !== 1 ? "s" : ""}
            {hasActiveFilters ? " (filtered)" : ""}
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-end gap-3 flex-wrap">
              {FILTER_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1 min-w-[160px] flex-1">
                  <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                  <Combobox
                    options={getOptionsForField(f.key)}
                    value={filters[f.key]}
                    onChange={(val) => setFilters((prev) => ({ ...prev, [f.key]: val }))}
                    placeholder={`All ${f.label}s`}
                  />
                </div>
              ))}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Request List */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading requests...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {hasActiveFilters ? "No requests match your filters." : "No requests yet."}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((req) => (
              <Card
                key={req.id}
                className="cursor-pointer transition-colors hover:border-primary/30"
                onClick={() => setSelectedRequest(req)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{req.feature_name}</h3>
                        <Badge
                          className={`${getPriorityConfig(req.priority).color} text-white text-xs border-transparent`}
                        >
                          {getPriorityConfig(req.priority).label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {req.product_name} &middot; {req.requester_name} &middot;{" "}
                        {new Date(req.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-sm mt-1 line-clamp-2">{req.problem_description}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground shrink-0">
                      <div>{req.jira_ticket_key}</div>
                      {req.attachments?.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          <ImageIcon className="h-3 w-3" />
                          {req.attachments.length}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {selectedRequest && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <DialogTitle>{selectedRequest.feature_name}</DialogTitle>
                    <Badge
                      className={`${getPriorityConfig(selectedRequest.priority).color} text-white text-xs border-transparent`}
                    >
                      {getPriorityConfig(selectedRequest.priority).label}
                    </Badge>
                  </div>
                  <DialogDescription>
                    Submitted on{" "}
                    {new Date(selectedRequest.created_at).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Product</span>
                      <p className="font-medium">{selectedRequest.product_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Feature</span>
                      <p className="font-medium">{selectedRequest.feature_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">PM</span>
                      <p className="font-medium">{selectedRequest.pm_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lead</span>
                      <p className="font-medium">{selectedRequest.lead_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Requester</span>
                      <p className="font-medium">{selectedRequest.requester_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Jira Ticket</span>
                      <p className="font-medium">{selectedRequest.jira_ticket_key}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="text-sm">
                    <span className="text-muted-foreground">Primary User</span>
                    <p className="font-medium">{selectedRequest.primary_user}</p>
                  </div>

                  <div className="text-sm">
                    <span className="text-muted-foreground">Feature Purpose</span>
                    <p className="mt-1 whitespace-pre-wrap">{selectedRequest.feature_purpose}</p>
                  </div>

                  <Separator />

                  <div className="text-sm">
                    <span className="text-muted-foreground">Problem Description</span>
                    <p className="mt-1 whitespace-pre-wrap">{selectedRequest.problem_description}</p>
                  </div>

                  {selectedRequest.attachments?.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-sm text-muted-foreground">Attachments</span>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {selectedRequest.attachments.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded-md border overflow-hidden hover:border-primary/50 transition-colors"
                            >
                              {url.match(/\.(mp4|webm|mov)$/i) ? (
                                <div className="flex items-center justify-center h-24 bg-muted">
                                  <ExternalLink className="h-5 w-5 text-muted-foreground" />
                                  <span className="ml-2 text-sm text-muted-foreground">Video</span>
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
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
