import { NextResponse } from "next/server";

// Redirect to the client-side page that will handle OTP verification
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash") || "";
  const type = searchParams.get("type") || "";
  const next = searchParams.get("next") || "/";

  // Pass params to client-side reset-password page which will call verifyOtp
  if (type === "recovery") {
    return NextResponse.redirect(
      `${origin}/reset-password?token_hash=${encodeURIComponent(token_hash)}&type=${type}`
    );
  }

  // For signup confirmation, redirect to a confirm page
  if (type === "signup") {
    return NextResponse.redirect(
      `${origin}/reset-password?token_hash=${encodeURIComponent(token_hash)}&type=${type}&next=${encodeURIComponent(next)}`
    );
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_type`);
}
