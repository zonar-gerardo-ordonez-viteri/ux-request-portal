import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: users } = await supabase.auth.admin.listUsers();
  const userExists = users?.users?.some((u) => u.email === email);

  if (!userExists) {
    return NextResponse.json(
      { error: "No account found with this email. Contact your admin." },
      { status: 404 }
    );
  }

  const { data: linkData, error: linkError } =
    await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
    });

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const token_hash = linkData.properties?.hashed_token;
  const resetUrl = `${origin}/auth/confirm?token_hash=${token_hash}&type=recovery&next=/reset-password`;

  return NextResponse.json({ resetUrl });
}
