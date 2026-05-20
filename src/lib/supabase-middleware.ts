import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Always allow these routes
  if (pathname.startsWith("/auth/") || pathname === "/reset-password") {
    return NextResponse.next();
  }

  // Check for Supabase auth cookie (fast — no server call)
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  // Redirect unauthenticated users to login
  if (!hasSession && pathname !== "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (hasSession && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
