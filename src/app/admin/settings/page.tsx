"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { AutocompleteOption, AllowedDomain, UserProfile } from "@/lib/types";
import {
  Trash2, Plus, Pencil, Globe, Users, ListFilter,
  ChevronRight, ChevronDown, Loader2, ArrowLeft, Save, X,
} from "lucide-react";
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
  const { canManageSettings, loading: authLoading } = useAuth();

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

  React.useEffect(() => { if (!authLoading) loadAll(); }, [authLoading]);

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
    if (error) alert(error.message);
  }
  async function deleteDomain(id: string) { await supabase.from("allowed_domains").delete().eq("id", id); setDomains((p) => p.filter((d) => d.id !== id)); }

  function openCreateUser() { setEditingUser(null); setUserForm({ email: "", full_name: "", role: "requester", product_name: "", pm_name: "", lead_name: "" }); setUserDialogOpen(true); }
  function openEditUser(user: UserProfile) { setEditingUser(user); setUserForm({ email: user.email, full_name: user.full_name, role: user.role, product_name: user.product_name || "", pm_name: user.pm_name || "", lead_name: user.lead_name || "" }); setUserDialogOpen(true); }

  async function saveUser() {
    if (editingUser) {
      const { error } = await supabase.from("profiles").update({ full_name: userForm.full_name, role: userForm.role, product_name: userForm.product_name, pm_name: userForm.pm_name, lead_name: userForm.lead_name, updated_at: new Date().toISOString() }).eq("id", editingUser.id);
      if (error) { alert(error.message); return; }
      setUsers((p) => p.map((u) => u.id === editingUser.id ? { ...u, ...userForm, updated_at: new Date().toISOString() } : u));
    } else {
      const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const { data, error } = await supabase.auth.signUp({ email: userForm.email, password: tempPassword, options: { data: { full_name: userForm.full_name } } });
      if (error) { alert(error.message); return; }
      if (data.user) {
        await supabase.from("profiles").update({ role: userForm.role, product_name: userForm.product_name, pm_name: userForm.pm_name, lead_name: userForm.lead_name }).eq("id", data.user.id);
        await supabase.auth.resetPasswordForEmail(userForm.email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
        await loadAll();
      }
    }
    setUserDialogOpen(false);
  }

  async function deleteUser(user: UserProfile) {
    if (!confirm(`Delete user "${user.full_name || user.email}"?`)) return;
    const { error } = await supabase.from("profiles").delete().eq("id", user.id);
    if (error) { alert(error.message); return; }
    setUsers((p) => p.filter((u) => u.id !== user.id));
  }

  function toggleGroup(key: string) { setExpandedGroups((p) => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; }); }
  function getGroupedUsers(): Record<string, UserProfile[]> { if (groupBy === "none") return { "All Users": users }; const g: Record<string, UserProfile[]> = {}; for (const u of users) { const k = (u[groupBy] as string) || "Unassigned"; if (!g[k]) g[k] = []; g[k].push(u); } return g; }
  function getHierarchyTree() { const t: Record<string, Record<string, Record<string, UserProfile[]>>> = {}; for (const u of users) { const pr = u.product_name || "No Product", l = u.lead_name || "No Lead", p = u.pm_name || "No PM"; if (!t[pr]) t[pr] = {}; if (!t[pr][l]) t[pr][l] = {}; if (!t[pr][l][p]) t[pr][l][p] = []; t[pr][l][p].push(u); } return t; }

  if (authLoading || loading) return <main className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--ig-fg3)]" /></main>;

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

        {/* DOMAINS */}
        <div className="ig-card" style={{ padding: 24 }}>
          <div className="flex items-center gap-2 mb-1"><Globe className="w-5 h-5 text-[var(--ig-fg2)]" /><h2 className="text-[15px] font-semibold text-[var(--ig-fg1)]">Allowed domains</h2></div>
          <p className="text-[12px] text-[var(--ig-fg3)] mb-4">Only users with these email domains can register. Leave empty to allow all.</p>
          <div className="flex gap-2 mb-3">
            <div className="ig-input flex-1"><input placeholder="e.g. company.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDomain())} /></div>
            <button className="ig-btn ig-btn-md ig-btn-primary" onClick={addDomain} disabled={!newDomain.trim()}><Plus className="w-4 h-4" /> Add</button>
          </div>
          {domains.length === 0 ? <p className="text-[12px] text-[var(--ig-fg3)] text-center py-4">No domain restrictions.</p> : (
            <div className="space-y-1">{domains.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-[var(--ig-border-light)] px-3 py-2 text-[13px]">
                <span className="font-mono text-[var(--ig-fg1)]">@{d.domain}</span>
                <button onClick={() => deleteDomain(d.id)} className="text-[var(--ig-fg3)] hover:text-[var(--ig-error)] transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}</div>
          )}
        </div>

        {/* USERS */}
        <div className="ig-card" style={{ padding: 24 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1"><Users className="w-5 h-5 text-[var(--ig-fg2)]" /><h2 className="text-[15px] font-semibold text-[var(--ig-fg1)]">Users</h2></div>
              <p className="text-[12px] text-[var(--ig-fg3)]">{users.length} registered user{users.length !== 1 ? "s" : ""}</p>
            </div>
            <button className="ig-btn ig-btn-sm ig-btn-primary" onClick={openCreateUser}><Plus className="w-4 h-4" /> Add user</button>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-3">
            <div className="flex border border-[var(--ig-border)] rounded-lg overflow-hidden text-[12px]">
              {(["table", "hierarchy"] as const).map((m) => (
                <button key={m} onClick={() => setViewMode(m)} className={`px-3 py-1.5 transition-colors ${viewMode === m ? "bg-[var(--ig-primary)] text-white" : "hover:bg-[var(--ig-surface)]"}`}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            {viewMode === "table" && (
              <div className="flex items-center gap-1.5 text-[12px]">
                <ListFilter className="w-3.5 h-3.5 text-[var(--ig-fg3)]" />
                <span className="text-[var(--ig-fg3)]">Group:</span>
                {(["none", "product_name", "pm_name", "lead_name"] as GroupBy[]).map((g) => (
                  <button key={g} onClick={() => { setGroupBy(g); setExpandedGroups(new Set()); }}
                    className={`px-2 py-0.5 rounded-md transition-colors ${groupBy === g ? "bg-[var(--ig-primary)] text-white" : "bg-[var(--ig-surface)] hover:bg-[var(--ig-surface-hover)]"}`}>
                    {g === "none" ? "None" : g === "product_name" ? "Product" : g === "pm_name" ? "PM" : "Lead"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ig-sep mb-3" />

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
                        <button onClick={() => deleteUser(user)} className="ig-iconbtn hover:text-[var(--ig-error)]" style={{ width: 28, height: 28 }}><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {users.length === 0 && <p className="text-[12px] text-[var(--ig-fg3)] text-center py-8">No users yet.</p>}
            </div>
          )}

          {viewMode === "hierarchy" && (
            <div className="space-y-1 text-[13px]">
              {Object.entries(getHierarchyTree()).map(([product, leads]) => (
                <div key={product} className="border border-[var(--ig-border-light)] rounded-lg">
                  <button onClick={() => toggleGroup(`prod-${product}`)} className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-[var(--ig-surface)] font-medium rounded-lg transition-colors">
                    {expandedGroups.has(`prod-${product}`) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="ig-pill ig-pill-sm ig-pill-neutral">Product</span> {product}
                  </button>
                  {expandedGroups.has(`prod-${product}`) && (
                    <div className="pl-6 pb-2 space-y-1">
                      {Object.entries(leads).map(([lead, pms]) => (
                        <div key={lead}>
                          <button onClick={() => toggleGroup(`lead-${product}-${lead}`)} className="flex items-center gap-2 w-full text-left px-3 py-1.5 hover:bg-[var(--ig-surface)] rounded-lg transition-colors">
                            {expandedGroups.has(`lead-${product}-${lead}`) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            <span className="ig-pill ig-pill-sm ig-pill-neutral">Lead</span> {lead}
                          </button>
                          {expandedGroups.has(`lead-${product}-${lead}`) && (
                            <div className="pl-6 space-y-1">
                              {Object.entries(pms).map(([pm, pmUsers]) => (
                                <div key={pm}>
                                  <button onClick={() => toggleGroup(`pm-${product}-${lead}-${pm}`)} className="flex items-center gap-2 w-full text-left px-3 py-1.5 hover:bg-[var(--ig-surface)] rounded-lg transition-colors">
                                    {expandedGroups.has(`pm-${product}-${lead}-${pm}`) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    <span className="ig-pill ig-pill-sm ig-pill-neutral">PM</span> {pm}
                                    <span className="text-[11px] text-[var(--ig-fg3)]">({pmUsers.length})</span>
                                  </button>
                                  {expandedGroups.has(`pm-${product}-${lead}-${pm}`) && (
                                    <div className="pl-8 py-1 space-y-1">
                                      {pmUsers.map((u) => (
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
              {users.length === 0 && <p className="text-[var(--ig-fg3)] text-center py-8">No users yet.</p>}
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
          <div className="max-h-48 overflow-y-auto space-y-1">
            {acOptions.filter((o) => o.field_name === acTab).map((option) => (
              <div key={option.id} className="flex items-center justify-between rounded-lg border border-[var(--ig-border-light)] px-3 py-2 text-[13px]">
                <span className="text-[var(--ig-fg1)]">{option.value}</span>
                <button onClick={() => deleteAcOption(option.id)} className="text-[var(--ig-fg3)] hover:text-[var(--ig-error)] transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {acOptions.filter((o) => o.field_name === acTab).length === 0 && <p className="text-[12px] text-[var(--ig-fg3)] text-center py-8">No saved options.</p>}
          </div>
        </div>

        {/* USER DIALOG */}
        {userDialogOpen && (
          <>
            <div className="ig-overlay" onClick={() => setUserDialogOpen(false)} />
            <div className="ig-dialog">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[16px] font-semibold text-[var(--ig-fg1)]">{editingUser ? "Edit user" : "Add user"}</h3>
                <button onClick={() => setUserDialogOpen(false)} className="ig-iconbtn" style={{ width: 28, height: 28 }}><X className="w-4 h-4" /></button>
              </div>
              <p className="text-[12px] text-[var(--ig-fg3)] mb-4">
                {editingUser ? "Update this user's profile and organizational assignment." : "Create a new user. They'll receive an email to set their password."}
              </p>
              <div className="space-y-3">
                {!editingUser && (
                  <div className="space-y-1"><label className="ig-label">Email</label><div className="ig-input"><input type="email" placeholder="user@company.com" value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} /></div></div>
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
                <p className="text-[11px] text-[var(--ig-fg3)]">Organizational assignment (for grouping and hierarchy)</p>
                <div className="space-y-1"><label className="ig-label">Product</label><div className="ig-input"><input placeholder="Product name" value={userForm.product_name} onChange={(e) => setUserForm((p) => ({ ...p, product_name: e.target.value }))} /></div></div>
                <div className="space-y-1"><label className="ig-label">PM</label><div className="ig-input"><input placeholder="PM name" value={userForm.pm_name} onChange={(e) => setUserForm((p) => ({ ...p, pm_name: e.target.value }))} /></div></div>
                <div className="space-y-1"><label className="ig-label">Lead</label><div className="ig-input"><input placeholder="Lead name" value={userForm.lead_name} onChange={(e) => setUserForm((p) => ({ ...p, lead_name: e.target.value }))} /></div></div>
                <button className="ig-btn ig-btn-md ig-btn-primary w-full" onClick={saveUser}><Save className="w-4 h-4" /> {editingUser ? "Save changes" : "Create user"}</button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
