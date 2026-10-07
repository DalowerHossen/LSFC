"use server";

import { z } from "zod";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordState = { error?: string; success?: string };

export async function requestPasswordResetAction(_state: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const parsed = z.object({ email: z.email() }).safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "সঠিক ইমেইল ঠিকানা লিখুন" };
  const siteUrl = z.url().safeParse(process.env.NEXT_PUBLIC_SITE_URL);
  if (!hasSupabasePublicEnv() || !siteUrl.success) return { error: "অ্যাকাউন্ট সেবা এখন প্রস্তুত নয়। প্রশাসকের সঙ্গে যোগাযোগ করুন।" };
  const redirectTo = `${siteUrl.data.replace(/\/$/, "")}/auth/callback?next=/set-password`;
  // Always return the same public response to prevent account enumeration.
  await (await createClient()).auth.resetPasswordForEmail(parsed.data.email, { redirectTo });
  return { success: "ইমেইলটি নিবন্ধিত থাকলে পাসওয়ার্ড পরিবর্তনের নিরাপদ লিংক পাঠানো হয়েছে।" };
}
