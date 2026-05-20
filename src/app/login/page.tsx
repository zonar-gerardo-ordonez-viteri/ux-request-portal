"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

type Mode = "login" | "signup" | "reset";

function RadarBackground() {
  return (
    <div
      className="fixed pointer-events-none"
      style={{
        top: "50%",
        left: "-15%",
        transform: "translateY(-50%)",
        width: "35vw",
        height: "35vw",
        opacity: 0.07,
      }}
    >
      <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Outer ring */}
        <circle cx="200" cy="200" r="195" stroke="#009FDF" strokeWidth="2" fill="rgba(0,159,223,0.08)" />
        {/* Ring 2 */}
        <circle cx="200" cy="200" r="155" stroke="#33B2E5" strokeWidth="1.5" fill="rgba(51,178,229,0.06)" />
        {/* Ring 3 */}
        <circle cx="200" cy="200" r="115" stroke="#66C5EC" strokeWidth="1" fill="rgba(102,197,236,0.05)" />
        {/* Ring 4 */}
        <circle cx="200" cy="200" r="75" stroke="#99D9F2" strokeWidth="1" fill="rgba(153,217,242,0.04)" />
        {/* Inner circle */}
        <circle cx="200" cy="200" r="35" stroke="#CCECF9" strokeWidth="0.5" fill="rgba(204,236,249,0.06)" />
        {/* Center dot */}
        <circle cx="200" cy="200" r="10" fill="white" />
        {/* Crosshairs */}
        <line x1="200" y1="5" x2="200" y2="395" stroke="#33B2E5" strokeWidth="0.5" opacity="0.3" />
        <line x1="5" y1="200" x2="395" y2="200" stroke="#33B2E5" strokeWidth="0.5" opacity="0.3" />
        {/* Rotating radar sweep */}
        <g style={{ transformOrigin: "200px 200px", animation: "radar-spin 4s linear infinite" }}>
          <line x1="200" y1="200" x2="200" y2="5" stroke="white" strokeWidth="2" strokeLinecap="round" />
          {/* Sweep glow trail */}
          <path
            d="M200,200 L200,5 A195,195 0 0,0 62,62 Z"
            fill="url(#sweepGrad)"
          />
        </g>
        <defs>
          <radialGradient id="sweepGrad" cx="200" cy="200" r="195" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="white" stopOpacity="0.15" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
      <style>{`
        @keyframes radar-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  const [mode, setMode] = React.useState<Mode>("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { window.location.href = "/"; }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const domain = email.split("@")[1];
    const { data: domains } = await supabase.from("allowed_domains").select("domain");
    if (domains && domains.length > 0 && !domains.some((d) => d.domain === domain)) {
      setError(`Registration is restricted. The domain @${domain} is not allowed.`);
      setLoading(false); return;
    }
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
    else setSuccess("Check your email for a confirmation link.");
    setLoading(false);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    if (error) setError(error.message);
    else setSuccess("Check your email for a password reset link.");
    setLoading(false);
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
      <RadarBackground />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Logo above card */}
        <img
          src="/zonar-logo-light.svg"
          alt="Zonar"
          style={{ width: 120, marginBottom: 36 }}
        />

        <div className="ig-card w-full" style={{ padding: 32 }}>
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-[var(--ig-fg1)]">UX Request Portal</h1>
            <p className="text-[13px] text-[var(--ig-fg2)] mt-1">
              {mode === "login" && "Sign in to your account"}
              {mode === "signup" && "Create a new account"}
              {mode === "reset" && "Create or reset your password"}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg mb-4" style={{ background: "var(--ig-error-light)" }}>
              <AlertCircle className="w-4 h-4 text-[var(--ig-error)] mt-0.5 shrink-0" />
              <p className="text-[13px] text-[var(--ig-error)]">{error}</p>
            </div>
          )}

          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-[var(--ig-success)] mx-auto" />
              <p className="text-[13px] text-[var(--ig-fg2)]">{success}</p>
              <button onClick={() => { setSuccess(""); setMode("login"); }} className="ig-btn ig-btn-md ig-btn-secondary w-full">
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              {mode === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1">
                    <label className="ig-label">Email</label>
                    <div className="ig-input"><input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                  </div>
                  <div className="space-y-1">
                    <label className="ig-label">Password</label>
                    <div className="ig-input"><input type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                  </div>
                  <button type="submit" className="ig-btn ig-btn-md ig-btn-primary w-full" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />} Sign in
                  </button>
                </form>
              )}

              {mode === "signup" && (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-1">
                    <label className="ig-label">Full name</label>
                    <div className="ig-input"><input placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
                  </div>
                  <div className="space-y-1">
                    <label className="ig-label">Email</label>
                    <div className="ig-input"><input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                  </div>
                  <div className="space-y-1">
                    <label className="ig-label">Password</label>
                    <div className="ig-input"><input type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></div>
                  </div>
                  <button type="submit" className="ig-btn ig-btn-md ig-btn-primary w-full" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />} Create account
                  </button>
                </form>
              )}

              {mode === "reset" && (
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="space-y-1">
                    <label className="ig-label">Email</label>
                    <div className="ig-input"><input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                  </div>
                  <p className="text-[12px] text-[var(--ig-fg3)]">We&apos;ll send you a link to create or reset your password.</p>
                  <button type="submit" className="ig-btn ig-btn-md ig-btn-primary w-full" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />} Send reset link
                  </button>
                </form>
              )}

              <div className="ig-sep my-4" />
              <div className="text-center space-y-2 text-[13px]">
                {mode === "login" && (
                  <>
                    <button onClick={() => { setMode("reset"); setError(""); }} className="block w-full text-[var(--ig-fg3)] hover:text-[var(--ig-fg1)] transition-colors">
                      Create or reset your password
                    </button>
                    <button onClick={() => { setMode("signup"); setError(""); }} className="block w-full text-[var(--ig-fg3)] hover:text-[var(--ig-fg1)] transition-colors">
                      Don&apos;t have an account? <span className="font-semibold text-[var(--ig-fg1)]">Sign up</span>
                    </button>
                  </>
                )}
                {(mode === "signup" || mode === "reset") && (
                  <button onClick={() => { setMode("login"); setError(""); }} className="text-[var(--ig-fg3)] hover:text-[var(--ig-fg1)] transition-colors">
                    Already have an account? <span className="font-semibold text-[var(--ig-fg1)]">Sign in</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
