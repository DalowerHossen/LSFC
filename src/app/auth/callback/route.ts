import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowedOtpTypes: EmailOtpType[] = [
  "invite",
  "recovery",
  "email",
  "email_change",
  "signup",
  "magiclink",
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const rawType = url.searchParams.get("type") as EmailOtpType | null;
  const requestedNext = url.searchParams.get("next");
  const next = requestedNext === "/set-password" ? requestedNext : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) { await supabase.rpc("accept_my_account_invitation"); return NextResponse.redirect(new URL(next, url.origin)); }
  }

  if (tokenHash && rawType && allowedOtpTypes.includes(rawType)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: rawType,
      token_hash: tokenHash,
    });
    if (!error) { await supabase.rpc("accept_my_account_invitation"); return NextResponse.redirect(new URL(next, url.origin)); }
  }

  return NextResponse.redirect(new URL("/login", url.origin));
}
