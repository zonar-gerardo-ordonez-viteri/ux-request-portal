"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

type Mode = "login" | "signup" | "reset";

// Blip positions: [angle in degrees, distance from center (0-1), size]
const BLIPS = [
  [30, 0.65, 2.5], [75, 0.82, 1.8], [110, 0.45, 2], [145, 0.7, 3],
  [170, 0.55, 1.5], [200, 0.88, 2.2], [230, 0.35, 1.8], [260, 0.72, 2.8],
  [290, 0.6, 2], [320, 0.48, 1.5], [350, 0.78, 2.5], [50, 0.38, 1.8],
  [130, 0.9, 2], [185, 0.42, 2.5], [310, 0.85, 1.8], [15, 0.52, 2],
  [95, 0.68, 1.5], [245, 0.55, 2.2], [275, 0.92, 2],
];

const SPIN_DURATION = 5; // seconds

function RadarBackground() {
  return (
    <div
      className="fixed pointer-events-none"
      style={{
        top: 0,
        left: "50%",
        width: "max(150vh, 150vw)",
        height: "max(150vh, 150vw)",
        transform: "translate(-50%, calc(-50% - 30px))",
      }}
    >
      <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <clipPath id="radarClip">
            <circle cx="200" cy="200" r="196" />
          </clipPath>
          <linearGradient id="trailGrad" x1="135" y1="100" x2="200" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34405A" stopOpacity="0" />
            <stop offset="100%" stopColor="#34405A" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <g clipPath="url(#radarClip)">
          {/* Stroke rings */}
          <circle cx="200" cy="200" r="196" stroke="#34405A" strokeWidth="0.2" fill="none" opacity="0.25" />
          <circle cx="200" cy="200" r="157" stroke="#34405A" strokeWidth="0.2" fill="none" opacity="0.25" />
          <circle cx="200" cy="200" r="118" stroke="#34405A" strokeWidth="0.2" fill="none" opacity="0.25" />
          <circle cx="200" cy="200" r="79" stroke="#34405A" strokeWidth="0.2" fill="none" opacity="0.25" />
          <circle cx="200" cy="200" r="40" stroke="#34405A" strokeWidth="0.2" fill="none" opacity="0.25" />

          {/* Blips — flash when sweep passes, then fade */}
          {BLIPS.map(([angle, dist, size], i) => {
            const rad = ((angle - 90) * Math.PI) / 180;
            const r = dist * 190;
            const cx = 200 + Math.cos(rad) * r;
            const cy = 200 + Math.sin(rad) * r;
            const delay = (angle / 360) * SPIN_DURATION;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={size}
                fill="#5B9AFF"
                style={{ animation: `blip-fade ${SPIN_DURATION}s linear infinite`, animationDelay: `${delay}s` }}
              />
            );
          })}

          {/* Rotating sweep */}
          <g style={{ transformOrigin: "200px 200px", animation: `radar-spin ${SPIN_DURATION}s linear infinite` }}>
            <polygon points="200,200 135,4 200,4" fill="url(#trailGrad)" />
            <line x1="200" y1="200" x2="200" y2="4" stroke="#34405A" strokeWidth="0.3" opacity="0.3" />
          </g>
        </g>
      </svg>
      <style>{`
        @keyframes radar-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes blip-fade {
          0% { opacity: 0; }
          2% { opacity: 0.5; }
          8% { opacity: 0.3; }
          25% { opacity: 0.08; }
          50% { opacity: 0; }
          100% { opacity: 0; }
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
