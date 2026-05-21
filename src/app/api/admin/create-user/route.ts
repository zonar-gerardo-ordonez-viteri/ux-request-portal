import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: Request) {
  const body = await request.json();
  const { email, full_name, role, product_name, pm_name, lead_name } = body;

  if (!email || !full_name) {
    return NextResponse.json({ error: "Email and full name are required." }, { status: 400 });
  }

  const tempPassword =
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  if (authData.user) {
    await supabaseAdmin
      .from("profiles")
      .update({ role, product_name, pm_name, lead_name })
      .eq("id", authData.user.id);

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
      });

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    const origin = new URL(request.url).origin;
    const token_hash = linkData.properties?.hashed_token;
    const resetUrl = `${origin}/auth/confirm?token_hash=${token_hash}&type=recovery&next=/reset-password`;

    const { error: emailError } = await resend.emails.send({
      from: "UX Request Portal <onboarding@resend.dev>",
      to: email,
      subject: "Welcome — Set your password",
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
          <h2 style="font-size: 20px; font-weight: 600; color: #212121; margin-bottom: 8px;">Welcome to UX Request Portal</h2>
          <p style="font-size: 14px; color: #666; line-height: 1.6; margin-bottom: 24px;">
            Hi ${full_name}, your account has been created. Click the button below to set your password.
          </p>
          <a href="${resetUrl}" style="display: inline-block; background: #005BF8; color: #fff; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none;">
            Set your password
          </a>
          <p style="font-size: 12px; color: #999; margin-top: 32px; line-height: 1.5;">
            If you didn't expect this email, you can safely ignore it.
          </p>
        </div>
      `,
    });

    if (emailError) {
      return NextResponse.json(
        { error: `User created but email failed: ${emailError.message}`, userId: authData.user.id },
        { status: 207 }
      );
    }
  }

  return NextResponse.json({ success: true, userId: authData.user?.id });
}
