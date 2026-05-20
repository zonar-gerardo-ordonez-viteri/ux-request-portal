"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type Mode = "login" | "signup" | "reset";

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
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = "/";
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Check allowed domains
    const domain = email.split("@")[1];
    const { data: domains } = await supabase
      .from("allowed_domains")
      .select("domain");

    if (domains && domains.length > 0) {
      const allowed = domains.some((d) => d.domain === domain);
      if (!allowed) {
        setError(`Registration is restricted. The domain @${domain} is not allowed.`);
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess("Check your email for a confirmation link to complete your registration.");
    }
    setLoading(false);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess("Check your email for a password reset link.");
    }
    setLoading(false);
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">UX Request Portal</CardTitle>
          <CardDescription>
            {mode === "login" && "Sign in to your account"}
            {mode === "signup" && "Create a new account"}
            {mode === "reset" && "Create or reset your password"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-sm text-muted-foreground">{success}</p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSuccess("");
                  setMode("login");
                }}
              >
                Back to Sign In
              </Button>
            </div>
          ) : (
            <>
              {mode === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              )}

              {mode === "signup" && (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              )}

              {mode === "reset" && (
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll send you a link to create or reset your password.
                  </p>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Reset Link
                  </Button>
                </form>
              )}

              <Separator />

              <div className="text-center space-y-2 text-sm">
                {mode === "login" && (
                  <>
                    <button
                      onClick={() => { setMode("reset"); setError(""); }}
                      className="text-muted-foreground hover:text-foreground transition-colors block w-full"
                    >
                      Create or reset your password
                    </button>
                    <button
                      onClick={() => { setMode("signup"); setError(""); }}
                      className="text-muted-foreground hover:text-foreground transition-colors block w-full"
                    >
                      Don&apos;t have an account? <span className="font-medium text-foreground">Sign up</span>
                    </button>
                  </>
                )}
                {(mode === "signup" || mode === "reset") && (
                  <button
                    onClick={() => { setMode("login"); setError(""); }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Already have an account? <span className="font-medium text-foreground">Sign in</span>
                  </button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
