"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { AutocompleteOption, AllowedDomain, UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trash2, Plus, Pencil, Globe, Users, ListFilter,
  ChevronRight, ChevronDown, Loader2, ArrowLeft, Save,
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

export default function SettingsPage() {
  const { isAdmin, loading: authLoading } = useAuth();

  const [acOptions, setAcOptions] = React.useState<AutocompleteOption[]>([]);
  const [domains, setDomains] = React.useState<AllowedDomain[]>([]);
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Domain form
  const [newDomain, setNewDomain] = React.useState("");

  // User form dialog
  const [userDialogOpen, setUserDialogOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserProfile | null>(null);
  const [userForm, setUserForm] = React.useState({
    email: "",
    full_name: "",
    role: "requester" as "admin" | "requester",
    product_name: "",
    pm_name: "",
    lead_name: "",
  });

  // Grouping
  const [groupBy, setGroupBy] = React.useState<GroupBy>("none");
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = React.useState<"table" | "hierarchy">("table");

  React.useEffect(() => {
    if (!authLoading) loadAll();
  }, [authLoading]);

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

  // -- Autocomplete Options --
  async function deleteAcOption(id: string) {
    await supabase.from("autocomplete_options").delete().eq("id", id);
    setAcOptions((prev) => prev.filter((o) => o.id !== id));
  }

  // -- Domains --
  async function addDomain() {
    const d = newDomain.trim().toLowerCase();
    if (!d) return;
    const { data, error } = await supabase
      .from("allowed_domains")
      .insert({ domain: d })
      .select()
      .single();
    if (data) {
      setDomains((prev) => [...prev, data]);
      setNewDomain("");
    }
    if (error) alert(error.message);
  }

  async function deleteDomain(id: string) {
    await supabase.from("allowed_domains").delete().eq("id", id);
    setDomains((prev) => prev.filter((d) => d.id !== id));
  }

  // -- Users CRUD --
  function openCreateUser() {
    setEditingUser(null);
    setUserForm({ email: "", full_name: "", role: "requester", product_name: "", pm_name: "", lead_name: "" });
    setUserDialogOpen(true);
  }

  function openEditUser(user: UserProfile) {
    setEditingUser(user);
    setUserForm({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      product_name: user.product_name || "",
      pm_name: user.pm_name || "",
      lead_name: user.lead_name || "",
    });
    setUserDialogOpen(true);
  }

  async function saveUser() {
    if (editingUser) {
      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: userForm.full_name,
          role: userForm.role,
          product_name: userForm.product_name,
          pm_name: userForm.pm_name,
          lead_name: userForm.lead_name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingUser.id);

      if (error) {
        alert(error.message);
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, ...userForm, updated_at: new Date().toISOString() }
            : u
        )
      );
    } else {
      // Create user via Supabase Auth Admin (invite)
      // Since we can't use admin API from the client, we create via signup invite
      const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const { data, error } = await supabase.auth.signUp({
        email: userForm.email,
        password: tempPassword,
        options: {
          data: { full_name: userForm.full_name },
        },
      });

      if (error) {
        alert(error.message);
        return;
      }

      if (data.user) {
        // Update the profile with extra fields
        await supabase.from("profiles").update({
          role: userForm.role,
          product_name: userForm.product_name,
          pm_name: userForm.pm_name,
          lead_name: userForm.lead_name,
        }).eq("id", data.user.id);

        // Send password reset so user can set their own password
        await supabase.auth.resetPasswordForEmail(userForm.email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });

        await loadAll();
      }
    }

    setUserDialogOpen(false);
  }

  async function deleteUser(user: UserProfile) {
    if (!confirm(`Delete user "${user.full_name || user.email}"? This cannot be undone.`)) return;
    // Delete profile (cascade will handle auth.users FK won't delete auth user from client)
    const { error } = await supabase.from("profiles").delete().eq("id", user.id);
    if (error) {
      alert(error.message);
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
  }

  // -- Grouping helpers --
  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function getGroupedUsers(): Record<string, UserProfile[]> {
    if (groupBy === "none") return { "All Users": users };
    const groups: Record<string, UserProfile[]> = {};
    for (const u of users) {
      const key = (u[groupBy] as string) || "Unassigned";
      if (!groups[key]) groups[key] = [];
      groups[key].push(u);
    }
    return groups;
  }

  // -- Hierarchy: Lead > PM > Product > Users --
  function getHierarchyTree() {
    const tree: Record<string, Record<string, Record<string, UserProfile[]>>> = {};
    for (const u of users) {
      const lead = u.lead_name || "No Lead";
      const pm = u.pm_name || "No PM";
      const product = u.product_name || "No Product";
      if (!tree[lead]) tree[lead] = {};
      if (!tree[lead][pm]) tree[lead][pm] = {};
      if (!tree[lead][pm][product]) tree[lead][pm][product] = [];
      tree[lead][pm][product].push(u);
    }
    return tree;
  }

  if (authLoading || loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center p-8">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">Admin only.</p>
          <Link href="/"><Button>Go Home</Button></Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-6 pb-16">
      <div className="max-w-4xl w-full mx-auto space-y-8">
        <div className="space-y-1">
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        </div>

        {/* ===================== ALLOWED DOMAINS ===================== */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Allowed Domains
            </CardTitle>
            <CardDescription>
              Only users with email addresses from these domains can register. Leave empty to allow all domains.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. company.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDomain())}
              />
              <Button onClick={addDomain} disabled={!newDomain.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            {domains.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No domain restrictions. Anyone can register.
              </p>
            ) : (
              <div className="space-y-1">
                {domains.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span className="font-mono">@{d.domain}</span>
                    <button
                      onClick={() => deleteDomain(d.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===================== USERS ===================== */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Users
                </CardTitle>
                <CardDescription>{users.length} registered user{users.length !== 1 ? "s" : ""}</CardDescription>
              </div>
              <Button size="sm" onClick={openCreateUser}>
                <Plus className="h-4 w-4 mr-1" />
                Add User
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* View mode & grouping controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex border rounded-lg overflow-hidden text-sm">
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1.5 ${viewMode === "table" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode("hierarchy")}
                  className={`px-3 py-1.5 ${viewMode === "hierarchy" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  Hierarchy
                </button>
              </div>
              {viewMode === "table" && (
                <div className="flex items-center gap-2 text-sm">
                  <ListFilter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Group by:</span>
                  {(["none", "product_name", "pm_name", "lead_name"] as GroupBy[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => { setGroupBy(g); setExpandedGroups(new Set()); }}
                      className={`px-2 py-0.5 rounded text-xs ${
                        groupBy === g ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {g === "none" ? "None" : g === "product_name" ? "Product" : g === "pm_name" ? "PM" : "Lead"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* TABLE VIEW */}
            {viewMode === "table" && (
              <div className="space-y-2">
                {Object.entries(getGroupedUsers()).map(([groupName, groupUsers]) => (
                  <div key={groupName}>
                    {groupBy !== "none" && (
                      <button
                        onClick={() => toggleGroup(groupName)}
                        className="flex items-center gap-1 text-sm font-medium mb-2 hover:text-foreground text-muted-foreground w-full text-left"
                      >
                        {expandedGroups.has(groupName) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        {groupName}
                        <Badge variant="outline" className="ml-1 text-xs">{groupUsers.length}</Badge>
                      </button>
                    )}
                    {(groupBy === "none" || expandedGroups.has(groupName)) && (
                      <div className="space-y-1">
                        {groupUsers.map((user) => (
                          <div key={user.id} className="flex items-center justify-between rounded-md border px-3 py-2.5 text-sm">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{user.full_name || "—"}</span>
                                <Badge variant={user.role === "admin" ? "default" : "outline"} className="text-xs">
                                  {user.role}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                              {(user.product_name || user.pm_name || user.lead_name) && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {[user.product_name, user.pm_name, user.lead_name].filter(Boolean).join(" · ")}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditUser(user)}
                                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => deleteUser(user)}
                                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No users yet.</p>
                )}
              </div>
            )}

            {/* HIERARCHY VIEW */}
            {viewMode === "hierarchy" && (
              <div className="space-y-1 text-sm">
                {Object.entries(getHierarchyTree()).map(([lead, pms]) => (
                  <div key={lead} className="border rounded-md">
                    <button
                      onClick={() => toggleGroup(`lead-${lead}`)}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-muted/50 font-medium"
                    >
                      {expandedGroups.has(`lead-${lead}`) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <Badge variant="outline" className="text-xs">Lead</Badge>
                      {lead}
                    </button>
                    {expandedGroups.has(`lead-${lead}`) && (
                      <div className="pl-6 pb-2 space-y-1">
                        {Object.entries(pms).map(([pm, products]) => (
                          <div key={pm}>
                            <button
                              onClick={() => toggleGroup(`pm-${lead}-${pm}`)}
                              className="flex items-center gap-2 w-full text-left px-3 py-1.5 hover:bg-muted/50"
                            >
                              {expandedGroups.has(`pm-${lead}-${pm}`) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              <Badge variant="outline" className="text-xs">PM</Badge>
                              {pm}
                            </button>
                            {expandedGroups.has(`pm-${lead}-${pm}`) && (
                              <div className="pl-6 space-y-1">
                                {Object.entries(products).map(([product, productUsers]) => (
                                  <div key={product}>
                                    <button
                                      onClick={() => toggleGroup(`prod-${lead}-${pm}-${product}`)}
                                      className="flex items-center gap-2 w-full text-left px-3 py-1.5 hover:bg-muted/50"
                                    >
                                      {expandedGroups.has(`prod-${lead}-${pm}-${product}`) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                      <Badge variant="outline" className="text-xs">Product</Badge>
                                      {product}
                                      <span className="text-muted-foreground text-xs">({productUsers.length})</span>
                                    </button>
                                    {expandedGroups.has(`prod-${lead}-${pm}-${product}`) && (
                                      <div className="pl-8 py-1 space-y-1">
                                        {productUsers.map((u) => (
                                          <div key={u.id} className="flex items-center justify-between px-2 py-1 rounded hover:bg-muted/30">
                                            <div className="flex items-center gap-2">
                                              <span>{u.full_name || u.email}</span>
                                              <Badge variant={u.role === "admin" ? "default" : "outline"} className="text-xs">
                                                {u.role}
                                              </Badge>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <button onClick={() => openEditUser(u)} className="p-1 hover:bg-muted rounded">
                                                <Pencil className="h-3 w-3" />
                                              </button>
                                            </div>
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
                {users.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No users yet.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===================== AUTOCOMPLETE OPTIONS ===================== */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListFilter className="h-5 w-5" />
              Autocomplete Options
            </CardTitle>
            <CardDescription>
              Remove saved autocomplete values from the request form.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="product_name">
              <TabsList className="w-full">
                {AUTOCOMPLETE_FIELDS.map((f) => (
                  <TabsTrigger key={f.key} value={f.key} className="text-xs">
                    {f.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {AUTOCOMPLETE_FIELDS.map((f) => (
                <TabsContent key={f.key} value={f.key}>
                  <ScrollArea className="h-48">
                    <div className="space-y-1">
                      {acOptions
                        .filter((o) => o.field_name === f.key)
                        .map((option) => (
                          <div
                            key={option.id}
                            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                          >
                            <span>{option.value}</span>
                            <button
                              onClick={() => deleteAcOption(option.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      {acOptions.filter((o) => o.field_name === f.key).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No saved options.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* ===================== USER CREATE/EDIT DIALOG ===================== */}
        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
              <DialogDescription>
                {editingUser
                  ? "Update this user's profile and organizational assignment."
                  : "Create a new user. They'll receive an email to set their password."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {!editingUser && (
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="user@company.com"
                    value={userForm.email}
                    onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  placeholder="John Doe"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm((p) => ({ ...p, full_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex gap-2">
                  {(["requester", "admin"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setUserForm((p) => ({ ...p, role: r }))}
                    >
                      <Badge
                        variant={userForm.role === r ? "default" : "outline"}
                        className={`cursor-pointer px-3 py-1 ${userForm.role === r ? "" : ""}`}
                      >
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <p className="text-xs text-muted-foreground">Organizational assignment (for grouping and hierarchy view)</p>

              <div className="space-y-2">
                <Label>Product</Label>
                <Input
                  placeholder="Product name"
                  value={userForm.product_name}
                  onChange={(e) => setUserForm((p) => ({ ...p, product_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>PM</Label>
                <Input
                  placeholder="PM name"
                  value={userForm.pm_name}
                  onChange={(e) => setUserForm((p) => ({ ...p, pm_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Lead</Label>
                <Input
                  placeholder="Lead name"
                  value={userForm.lead_name}
                  onChange={(e) => setUserForm((p) => ({ ...p, lead_name: e.target.value }))}
                />
              </div>

              <Button className="w-full" onClick={saveUser}>
                <Save className="h-4 w-4 mr-2" />
                {editingUser ? "Save Changes" : "Create User"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
