import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const { email, full_name, role, product_name, pm_name, lead_name } = body;

  if (!email || !full_name) {
    return NextResponse.json({ error: "Email and full name are required." }, { status: 400 });
  }

  const tempPassword =
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

  const supabase = getSupabaseAdmin();

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  if (authData.user) {
    await supabase
      .from("profiles")
      .update({ role, product_name, pm_name, lead_name })
      .eq("id", authData.user.id);

    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
      });

    if (linkError) {
      return NextResponse.json(
        { error: linkError.message, userId: authData.user.id },
        { status: 207 }
      );
    }

    const origin = new URL(request.url).origin;
    const token_hash = linkData.properties?.hashed_token;
    const resetUrl = `${origin}/auth/confirm?token_hash=${token_hash}&type=recovery&next=/reset-password`;

    return NextResponse.json({
      success: true,
      userId: authData.user.id,
      resetUrl,
    });
  }

  return NextResponse.json({ success: true });
}
