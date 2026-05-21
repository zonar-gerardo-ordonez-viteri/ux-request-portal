"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { AutocompleteOption, AllowedDomain, UserProfile } from "@/lib/types";
import {
  Trash2, Plus, Pencil, Globe, Users, ListFilter, X, Settings2, List, GitBranch, Check,
  ChevronRight, ChevronDown, Loader2, ArrowLeft, Save, Shield, Tag,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Modal, ModalActions } from "@/components/modal";
import { FilterButton, FilterOption } from "@/components/filter-button";
import { useToast } from "@/components/toast";
import { EmptyState } from "@/components/empty-state";
import Link from "next/link";

const AUTOCOMPLETE_FIELDS = [
  { key: "product_name", label: "Product" },
  { key: "feature_name", label: "Feature" },
  { key: "pm_name", label: "PM" },
  { key: "lead_name", label: "Lead" },
  { key: "requester_name", label: "Requester" },
];

type GroupBy = "product_name" | "pm_name" | "lead_name" | "none";

const ROLE_PILL: Record<string, string> = {
  admin: "ig-pill ig-pill-sm ig-pill-solid-blue",
  lead: "ig-pill ig-pill-sm ig-pill-blue",
  requester: "ig-pill ig-pill-sm ig-pill-neutral",
};

export default function SettingsPage() {
  const { canManageSettings, ready } = useAuth();
  const { toast } = useToast();

  const [acOptions, setAcOptions] = React.useState<AutocompleteOption[]>([]);
  const [domains, setDomains] = React.useState<AllowedDomain[]>([]);
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newDomain, setNewDomain] = React.useState("");
  const [userDialogOpen, setUserDialogOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserProfile | null>(null);
  const [userForm, setUserForm] = React.useState({ email: "", full_name: "", role: "requester" as "admin" | "lead" | "requester", product_name: "", pm_name: "", lead_name: "" });
  const [groupBy, setGroupBy] = React.useState<GroupBy>("none");
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = React.useState<"table" | "hierarchy">("table");
  const [acTab, setAcTab] = React.useState("product_name");
  const [viewMenuOpen, setViewMenuOpen] = React.useState(false);
  const [domainWarning, setDomainWarning] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (userDialogOpen && userForm.email.includes("@")) checkEmailDomain(userForm.email);
  }, [domains]); // eslint-disable-line react-hooks/exhaustive-deps

  function checkEmailDomain(email: string) {
    if (!email.includes("@") || domains.length === 0) { setDomainWarning(null); return; }
    const d = email.split("@")[1];
    if (!d) { setDomainWarning(null); return; }
    if (!domains.some((ad) => ad.domain === d)) {
      setDomainWarning(`The domain @${d} is not in the allowed domains list. Add it first before creating this user.`);
    } else {
      setDomainWarning(null);
    }
  }
  const viewMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) setViewMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  React.useEffect(() => { if (ready) loadAll(); }, [ready]);

  async function loadAll() {
    setLoading(true);
    const [acRes, domRes, usersRes] = await Promise.all([
      supabase.from("autocomplete_options").select("*").order("value"),
      supabase.from("allowed_domains").select("*").order("domain"),
      supabase.from("profiles").select("*").order("full_name"),
    ]);
    if (acRes.data) setAcOptions(acRes.data);
    if (domRes.data) setDomains(domRes.data);
    if (usersRes.data) setUsers(usersRes.data);
    setLoading(false);
  }

  async function deleteAcOption(id: string) { await supabase.from("autocomplete_options").delete().eq("id", id); setAcOptions((p) => p.filter((o) => o.id !== id)); }

  async function addDomain() {
    const d = newDomain.trim().toLowerCase(); if (!d) return;
    const { data, error } = await supabase.from("allowed_domains").insert({ domain: d }).select().single();
    if (data) { setDomains((p) => [...p, data]); setNewDomain(""); }
    if (error) toast("error", error.message);
  }
  async function deleteDomain(id: string) { await supabase.from("allowed_domains").delete().eq("id", id); setDomains((p) => p.filter((d) => d.id !== id)); }

  function openCreateUser() { setEditingUser(null); setUserForm({ email: "", full_name: "", role: "requester", product_name: "", pm_name: "", lead_name: "" }); setDomainWarning(null); setUserDialogOpen(true); }
  function openEditUser(user: UserProfile) { setEditingUser(user); setUserForm({ email: user.email, full_name: user.full_name, role: user.role, product_name: user.product_name || "", pm_name: user.pm_name || "", lead_name: user.lead_name || "" }); setUserDialogOpen(true); }

  async function saveUser() {
    if (editingUser) {
      const { error } = await supabase.from("profiles").update({ full_name: userForm.full_name, role: userForm.role, product_name: userForm.product_name, pm_name: userForm.pm_name, lead_name: userForm.lead_name, updated_at: new Date().toISOString() }).eq("id", editingUser.id);
      if (error) { toast("error", error.message); return; }
      setUsers((p) => p.map((u) => u.id === editingUser.id ? { ...u, ...userForm, updated_at: new Date().toISOString() } : u));
    } else {
      // Validate domain against allowed list
      if (domains.length > 0) {
        const emailDomain = userForm.email.split("@")[1];
        if (!domains.some((d) => d.domain === emailDomain)) {
          checkEmailDomain(userForm.email);
          return;
        }
      }
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userForm.email, full_name: userForm.full_name, role: userForm.role, product_name: userForm.product_name, pm_name: userForm.pm_name, lead_name: userForm.lead_name }),
      });
      const result = await res.json();
      if (!res.ok && res.status !== 207) { toast("error", result.error); return; }
      if (res.status === 207) { toast("info", result.error); }
      await loadAll();
    }
    setUserDialogOpen(false);
  }

  const [confirmDeleteUser, setConfirmDeleteUser] = React.useState<UserProfile | null>(null);

  async function doDeleteUser() {
    if (!confirmDeleteUser) return;
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: confirmDeleteUser.id }),
    });
    const result = await res.json();
    if (!res.ok) { toast("error", result.error); setConfirmDeleteUser(null); return; }
    setUsers((p) => p.filter((u) => u.id !== confirmDeleteUser.id));
    setConfirmDeleteUser(null);
    toast("success", "User deleted.");
  }

  function toggleGroup(key: string) { setExpandedGroups((p) => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; }); }
  function getGroupedUsers(): Record<string, UserProfile[]> { if (groupBy === "none") return { "All Users": users }; const g: Record<string, UserProfile[]> = {}; for (const u of users) { const k = (u[groupBy] as string) || "Unassigned"; if (!g[k]) g[k] = []; g[k].push(u); } return g; }
  function getHierarchyTree() { const t: Record<string, Record<string, Record<string, UserProfile[]>>> = {}; for (const u of users) { const pr = u.product_name || "No Product", p = u.pm_name || "No PM", l = u.lead_name || "No Lead"; if (!t[pr]) t[pr] = {}; if (!t[pr][p]) t[pr][p] = {}; if (!t[pr][p][l]) t[pr][p][l] = []; t[pr][p][l].push(u); } return t; }

  if (!ready || loading) return <main className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--ig-fg3)]" /></main>;

  if (!canManageSettings) return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="ig-card text-center" style={{ padding: 32, maxWidth: 400 }}>
        <h2 className="text-lg font-bold text-[var(--ig-fg1)] mb-2">Access denied</h2>
        <p className="text-[13px] text-[var(--ig-fg2)] mb-4">Admin only.</p>
        <Link href="/"><button className="ig-btn ig-btn-md ig-btn-primary">Go home</button></Link>
      </div>
    </main>
  );

  return (
    <main className="flex-1 flex flex-col py-8">
      <div className="ig-container space-y-8">
        <div className="space-y-1">
          <Link href="/" className="text-[13px] text-[var(--ig-fg3)] hover:text-[var(--ig-fg1)] transition-colors inline-flex items-center gap-1" style={{ marginBottom: 24 }}>
            <ArrowLeft className="w-3 h-3" /> Back
          </Link>
          <h1 className="text-2xl font-bold text-[var(--ig-fg1)]">Settings</h1>
        </div>

        {/* USERS */}
        <div className="ig-card" style={{ padding: 24 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1"><Users className="w-5 h-5 text-[var(--ig-fg2)]" /><h2 className="text-[15px] font-semibold text-[var(--ig-fg1)]">Users</h2></div>
              <p className="text-[12px] text-[var(--ig-fg3)]">{users.length} registered user{users.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Group filter (table view only) */}
              {viewMode === "table" && (
                <FilterButton
                  icon={<ListFilter className="w-4 h-4" />}
                  label="Group by"
                  activeLabel={groupBy !== "none" ? `By ${groupBy === "product_name" ? "Product" : groupBy === "pm_name" ? "PM" : "Lead"}` : undefined}
                  active={groupBy !== "none"}
                  onClear={() => { setGroupBy("none"); setExpandedGroups(new Set()); }}
                >
                  {(["product_name", "pm_name", "lead_name"] as GroupBy[]).map((g) => (
                    <FilterOption key={g} label={g === "product_name" ? "Product" : g === "pm_name" ? "PM" : "Lead"} onClick={() => { setGroupBy(g); setExpandedGroups(new Set()); }} />
                  ))}
                </FilterButton>
              )}
              {/* Add user */}
              <button className="ig-btn ig-btn-md ig-btn-primary" onClick={openCreateUser}><Plus className="w-4 h-4" /> Add user</button>
              {/* View settings */}
              <div className="relative" ref={viewMenuRef}>
                <button className="ig-iconbtn" style={{ width: 36, height: 36, border: "1px solid var(--ig-border-strong)", borderRadius: 8 }} onClick={() => setViewMenuOpen(!viewMenuOpen)}>
                  <Settings2 className="w-[18px] h-[18px]" />
                </button>
                {viewMenuOpen && (
                  <div className="ig-popover absolute right-0 top-full mt-1" style={{ padding: 4, minWidth: 180 }}>
                    <button onClick={() => { setViewMode("table"); setViewMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-[13px] flex items-center justify-between transition-colors"
                      style={{ color: "var(--ig-fg1)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ig-surface-raised)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span className="flex items-center gap-2"><List className="w-4 h-4" style={{ color: "var(--ig-fg3)" }} /> Table view</span>
                      {viewMode === "table" && <Check className="w-3.5 h-3.5" style={{ color: "var(--ig-primary)" }} />}
                    </button>
                    <button onClick={() => { setViewMode("hierarchy"); setViewMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-[13px] flex items-center justify-between transition-colors"
                      style={{ color: "var(--ig-fg1)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ig-surface-raised)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span className="flex items-center gap-2"><GitBranch className="w-4 h-4" style={{ color: "var(--ig-fg3)" }} /> Hierarchy view</span>
                      {viewMode === "hierarchy" && <Check className="w-3.5 h-3.5" style={{ color: "var(--ig-primary)" }} />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {viewMode === "table" && (
            <div className="space-y-1.5">
              {Object.entries(getGroupedUsers()).map(([name, gUsers]) => (
                <div key={name}>
                  {groupBy !== "none" && (
                    <button onClick={() => toggleGroup(name)} className="flex items-center gap-1 text-[13px] font-medium mb-2 text-[var(--ig-fg2)] hover:text-[var(--ig-fg1)] w-full text-left">
                      {expandedGroups.has(name) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      {name} <span className="ig-pill ig-pill-sm ig-pill-neutral ml-1">{gUsers.length}</span>
                    </button>
                  )}
                  {(groupBy === "none" || expandedGroups.has(name)) && gUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between rounded-lg border border-[var(--ig-border-light)] px-3 py-2.5 text-[13px]">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--ig-fg1)]">{user.full_name || "—"}</span>
                          <span className={ROLE_PILL[user.role]}>{user.role}</span>
                        </div>
                        <p className="text-[11px] text-[var(--ig-fg3)]">{user.email}</p>
                        {(user.product_name || user.pm_name || user.lead_name) && (
                          <p className="text-[11px] text-[var(--ig-fg3)] mt-0.5">{[user.product_name, user.pm_name, user.lead_name].filter(Boolean).join(" · ")}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditUser(user)} className="ig-iconbtn" style={{ width: 28, height: 28 }}><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirmDeleteUser(user)} className="ig-iconbtn hover:text-[var(--ig-error)]" style={{ width: 28, height: 28 }}><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {users.length === 0 && <EmptyState icon={Users} title="No users yet" description="Add users to your organization to get started." action={{ label: "Add user", onClick: openCreateUser }} />}
            </div>
          )}

          {viewMode === "hierarchy" && (
            <div className="space-y-1 text-[13px]">
              {Object.entries(getHierarchyTree()).map(([product, pms]) => (
                <div key={product} className="border border-[var(--ig-border-light)] rounded-lg">
                  <button onClick={() => toggleGroup(`prod-${product}`)} className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-[var(--ig-surface)] font-medium rounded-lg transition-colors">
                    {expandedGroups.has(`prod-${product}`) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="ig-pill ig-pill-sm ig-pill-neutral">Product</span> {product}
                  </button>
                  {expandedGroups.has(`prod-${product}`) && (
                    <div className="pl-6 pb-2 space-y-1">
                      {Object.entries(pms).map(([pm, leads]) => (
                        <div key={pm}>
                          <button onClick={() => toggleGroup(`pm-${product}-${pm}`)} className="flex items-center gap-2 w-full text-left px-3 py-1.5 hover:bg-[var(--ig-surface)] rounded-lg transition-colors">
                            {expandedGroups.has(`pm-${product}-${pm}`) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            <span className="ig-pill ig-pill-sm ig-pill-neutral">PM</span> {pm}
                          </button>
                          {expandedGroups.has(`pm-${product}-${pm}`) && (
                            <div className="pl-6 space-y-1">
                              {Object.entries(leads).map(([lead, leadUsers]) => (
                                <div key={lead}>
                                  <button onClick={() => toggleGroup(`lead-${product}-${pm}-${lead}`)} className="flex items-center gap-2 w-full text-left px-3 py-1.5 hover:bg-[var(--ig-surface)] rounded-lg transition-colors">
                                    {expandedGroups.has(`lead-${product}-${pm}-${lead}`) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    <span className="ig-pill ig-pill-sm ig-pill-neutral">Lead</span> {lead}
                                    <span className="text-[11px] text-[var(--ig-fg3)]">({leadUsers.length})</span>
                                  </button>
                                  {expandedGroups.has(`lead-${product}-${pm}-${lead}`) && (
                                    <div className="pl-8 py-1 space-y-1">
                                      {leadUsers.map((u) => (
                                        <div key={u.id} className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-[var(--ig-surface)] transition-colors">
                                          <div className="flex items-center gap-2">
                                            <span>{u.full_name || u.email}</span>
                                            <span className={ROLE_PILL[u.role]}>{u.role}</span>
                                          </div>
                                          <button onClick={() => openEditUser(u)} className="ig-iconbtn" style={{ width: 24, height: 24 }}><Pencil className="w-3 h-3" /></button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {users.length === 0 && <EmptyState icon={Users} title="No users yet" description="Add users to your organization to get started." action={{ label: "Add user", onClick: openCreateUser }} />}
            </div>
          )}
        </div>

        {/* AUTOCOMPLETE OPTIONS */}
        <div className="ig-card" style={{ padding: 24 }}>
          <div className="flex items-center gap-2 mb-1"><ListFilter className="w-5 h-5 text-[var(--ig-fg2)]" /><h2 className="text-[15px] font-semibold text-[var(--ig-fg1)]">Autocomplete options</h2></div>
          <p className="text-[12px] text-[var(--ig-fg3)] mb-4">Remove saved autocomplete values from the request form.</p>
          <div className="flex border-b border-[var(--ig-border-light)] mb-3">
            {AUTOCOMPLETE_FIELDS.map((f) => (
              <button key={f.key} onClick={() => setAcTab(f.key)}
                className={`px-3 py-2 text-[12px] font-medium transition-colors border-b-2 -mb-px ${acTab === f.key ? "border-[var(--ig-primary)] text-[var(--ig-primary)]" : "border-transparent text-[var(--ig-fg3)] hover:text-[var(--ig-fg2)]"}`}>
                {f.label}
              </button>
            ))}
          </div>
          {acOptions.filter((o) => o.field_name === acTab).length === 0 ? (
            <EmptyState icon={Tag} title="No saved options" description="Options will appear here as users fill out the request form." />
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {acOptions.filter((o) => o.field_name === acTab).map((option) => (
                <div key={option.id} className="flex items-center justify-between rounded-lg border border-[var(--ig-border-light)] px-3 py-2 text-[13px]">
                  <span className="text-[var(--ig-fg1)]">{option.value}</span>
                  <button onClick={() => deleteAcOption(option.id)} className="text-[var(--ig-fg3)] hover:text-[var(--ig-error)] transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ALLOWED DOMAINS */}
        <div className="ig-card" style={{ padding: 24 }}>
          <div className="flex items-center gap-2 mb-1"><Globe className="w-5 h-5 text-[var(--ig-fg2)]" /><h2 className="text-[15px] font-semibold text-[var(--ig-fg1)]">Allowed domains</h2></div>
          <p className="text-[12px] text-[var(--ig-fg3)] mb-4">Only users with these email domains can register. Leave empty to allow all.</p>
          <div className="flex gap-2 mb-3">
            <div className="ig-input flex-1" style={{ display: "flex", alignItems: "center" }}><span className="text-[13px] shrink-0" style={{ color: "var(--ig-fg3)" }}>@</span><input placeholder="company.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value.replace(/@/g, ""))} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDomain())} /></div>
            <button className="ig-btn ig-btn-md ig-btn-primary" onClick={addDomain} disabled={!newDomain.trim()}><Plus className="w-4 h-4" /> Add</button>
          </div>
          {domains.length === 0 ? <EmptyState icon={Shield} title="No domain restrictions" description="Anyone with any email address can register. Add a domain to restrict access." /> : (
            <div className="space-y-1">{domains.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-[var(--ig-border-light)] px-3 py-2 text-[13px]">
                <span className="font-mono text-[var(--ig-fg1)]">@{d.domain}</span>
                <button onClick={() => deleteDomain(d.id)} className="text-[var(--ig-fg3)] hover:text-[var(--ig-error)] transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}</div>
          )}
        </div>

        <Modal open={userDialogOpen} onClose={() => setUserDialogOpen(false)} title={editingUser ? "Edit user" : "Add user"}>
          <p className="text-[12px] mb-4" style={{ color: "var(--ig-fg3)" }}>
            {editingUser ? "Update this user's profile and organizational assignment." : "Create a new user. They'll receive an email to set their password."}
          </p>
          <div className="space-y-3">
            {!editingUser && (
              <div className="space-y-1">
                <label className="ig-label">Email</label>
                <div className="ig-input"><input type="email" placeholder="user@company.com" value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} onBlur={(e) => checkEmailDomain(e.target.value)} /></div>
                {domainWarning && (
                  <div className="flex items-start gap-2 rounded-md px-3 py-2 mt-1" style={{ background: "rgba(255,183,77,0.12)", border: "1px solid rgba(255,183,77,0.3)" }}>
                    <Globe className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#FFB74D" }} />
                    <p className="text-[12px]" style={{ color: "#FFB74D" }}>{domainWarning}</p>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-1"><label className="ig-label">Full name</label><div className="ig-input"><input placeholder="John Doe" value={userForm.full_name} onChange={(e) => setUserForm((p) => ({ ...p, full_name: e.target.value }))} /></div></div>
            <div className="space-y-1">
              <label className="ig-label">Role</label>
              <div className="flex gap-2">
                {(["requester", "lead", "admin"] as const).map((r) => (
                  <button key={r} type="button" onClick={() => setUserForm((p) => ({ ...p, role: r }))}
                    className={`ig-pill cursor-pointer ${userForm.role === r ? "ig-pill-solid-blue" : "ig-pill-neutral"}`}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="ig-sep" />
            <p className="text-[11px]" style={{ color: "var(--ig-fg3)" }}>Organizational assignment (for grouping and hierarchy)</p>
            <div className="space-y-1"><label className="ig-label">Product</label><div className="ig-input"><input placeholder="Product name" value={userForm.product_name} onChange={(e) => setUserForm((p) => ({ ...p, product_name: e.target.value }))} /></div></div>
            <div className="space-y-1"><label className="ig-label">PM</label><div className="ig-input"><input placeholder="PM name" value={userForm.pm_name} onChange={(e) => setUserForm((p) => ({ ...p, pm_name: e.target.value }))} /></div></div>
            <div className="space-y-1"><label className="ig-label">Lead</label><div className="ig-input"><input placeholder="Lead name" value={userForm.lead_name} onChange={(e) => setUserForm((p) => ({ ...p, lead_name: e.target.value }))} /></div></div>
          </div>
          <ModalActions>
            <button className="ig-btn ig-btn-md ig-btn-primary w-full" onClick={saveUser}><Save className="w-4 h-4" /> {editingUser ? "Save changes" : "Create user"}</button>
          </ModalActions>
        </Modal>
      </div>
      <ConfirmDialog
        open={!!confirmDeleteUser}
        title="Delete user"
        message={`Are you sure you want to delete "${confirmDeleteUser?.full_name || confirmDeleteUser?.email}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={doDeleteUser}
        onCancel={() => setConfirmDeleteUser(null)}
      />
    </main>
  );
}
