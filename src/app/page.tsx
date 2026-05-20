"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { profile, canViewRequests, canManageSettings, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">UX Request Portal</h1>
          <p className="text-muted-foreground">
            Welcome, {profile?.full_name || profile?.email || "User"}
          </p>
        </div>
        <div
          className={`grid gap-4 ${
            canViewRequests || canManageSettings ? "sm:grid-cols-2" : ""
          }`}
        >
          {/* Everyone can submit requests */}
          <Link href="/request">
            <Card className="h-full transition-colors hover:border-primary/50 cursor-pointer">
              <CardHeader>
                <CardTitle>Submit a Request</CardTitle>
                <CardDescription>
                  Need UX guidance? Submit a detailed request so our design team can help.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">New Request</Button>
              </CardContent>
            </Card>
          </Link>

          {/* Lead + Admin can view requests */}
          {canViewRequests && (
            <Link href="/dashboard">
              <Card className="h-full transition-colors hover:border-primary/50 cursor-pointer">
                <CardHeader>
                  <CardTitle>Request Dashboard</CardTitle>
                  <CardDescription>
                    View, filter, and manage all incoming UX requests.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">Open Dashboard</Button>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Admin only: settings */}
          {canManageSettings && (
            <Link href="/admin/settings">
              <Card className="h-full transition-colors hover:border-primary/50 cursor-pointer">
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>
                    Manage users, allowed domains, and autocomplete options.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">Open Settings</Button>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
