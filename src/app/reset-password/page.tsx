"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--ig-fg3)" }} /></main>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [verifying, setVerifying] = React.useState(true);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const didVerify = React.useRef(false);

  // On mount: verify OTP token from URL if present
  React.useEffect(() => {
    if (didVerify.current) return;
    didVerify.current = true;

    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type") as "recovery" | "signup" | null;

    if (!token_hash || !type) {
      setError("Invalid or missing reset link. Please request a new one.");
      setVerifying(false);
      return;
    }

    supabase.auth.verifyOtp({ token_hash, type }).then(({ error }) => {
      if (error) setError("This link has expired or is invalid. Please request a new one.");
      setVerifying(false);
    });
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setBusy(false);
  }

  if (verifying) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--ig-fg3)" }} />
      </main>
    );
  }

  if (success) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="ig-card w-full max-w-md text-center" style={{ padding: 32 }}>
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--ig-success)" }} />
          <h2 className="text-lg font-bold" style={{ color: "var(--ig-fg1)" }}>Password updated</h2>
          <p className="text-[13px] mt-1 mb-4" style={{ color: "var(--ig-fg2)" }}>Your password has been set. You can now sign in.</p>
          <button className="ig-btn ig-btn-md ig-btn-primary w-full" onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}>
            Go to sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="ig-card w-full max-w-md" style={{ padding: 32 }}>
        <div className="text-center mb-6">
          <img src="/zonar-logo-light.svg" alt="Zonar" style={{ width: 120 }} className="mx-auto mb-4" />
          <h1 className="text-xl font-bold" style={{ color: "var(--ig-fg1)" }}>Set your password</h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--ig-fg2)" }}>Enter your new password below.</p>
        </div>
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg mb-4" style={{ background: "var(--ig-error-light)" }}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--ig-error)" }} />
            <p className="text-[13px]" style={{ color: "var(--ig-error)" }}>{error}</p>
          </div>
        )}
        {!error && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="ig-label">New password</label>
              <div className="ig-input"><input type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></div>
            </div>
            <div className="space-y-1">
              <label className="ig-label">Confirm password</label>
              <div className="ig-input"><input type="password" placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></div>
            </div>
            <button type="submit" className="ig-btn ig-btn-md ig-btn-primary w-full" disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Update password
            </button>
          </form>
        )}
        {error && (
          <button className="ig-btn ig-btn-md ig-btn-secondary w-full mt-4" onClick={() => window.location.href = "/login"}>
            Back to sign in
          </button>
        )}
      </div>
    </main>
  );
}
