"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <main className="flex-1 flex items-center justify-center p-6" style={{ background: "var(--ig-surface)" }}>
        <div className="ig-card w-full max-w-md text-center" style={{ padding: 32 }}>
          <CheckCircle2 className="w-12 h-12 text-[var(--ig-success)] mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--ig-fg1)]">Password updated</h2>
          <p className="text-[13px] text-[var(--ig-fg2)] mt-1 mb-4">Your password has been successfully updated.</p>
          <button className="ig-btn ig-btn-md ig-btn-primary w-full" onClick={() => (window.location.href = "/")}>
            Go to dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6" style={{ background: "var(--ig-surface)" }}>
      <div className="ig-card w-full max-w-md" style={{ padding: 32 }}>
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-[var(--ig-fg1)]">Set your password</h1>
          <p className="text-[13px] text-[var(--ig-fg2)] mt-1">Enter your new password below.</p>
        </div>
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg mb-4" style={{ background: "var(--ig-error-light)" }}>
            <AlertCircle className="w-4 h-4 text-[var(--ig-error)] mt-0.5 shrink-0" />
            <p className="text-[13px] text-[var(--ig-error)]">{error}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="ig-label">New password</label>
            <div className="ig-input"><input type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></div>
          </div>
          <div className="space-y-1">
            <label className="ig-label">Confirm password</label>
            <div className="ig-input"><input type="password" placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></div>
          </div>
          <button type="submit" className="ig-btn ig-btn-md ig-btn-primary w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Update password
          </button>
        </form>
      </div>
    </main>
  );
}
