import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">UX Request Portal</h1>
          <p className="text-muted-foreground">
            Centralized hub for submitting and managing UX guidance requests.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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
          <Link href="/admin">
            <Card className="h-full transition-colors hover:border-primary/50 cursor-pointer">
              <CardHeader>
                <CardTitle>Admin Dashboard</CardTitle>
                <CardDescription>
                  View, filter, and manage all incoming UX requests.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">Open Dashboard</Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </main>
  );
}
