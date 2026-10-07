"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext, getMfaStep } from "@/lib/auth/session";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME } from "@/types/auth";

const loginSchema = z.object({
  email: z.email("সঠিক ইমেইল ঠিকানা লিখুন"),
  password: z.string().min(8, "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে"),
});

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "তথ্য যাচাই করুন" };
  }

  if (!hasSupabasePublicEnv()) {
    return {
      error: "Supabase সংযোগ এখনো কনফিগার করা হয়নি। প্রশাসকের সঙ্গে যোগাযোগ করুন।",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Deliberately generic to avoid account enumeration.
    return { error: "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়" };
  }

  const context = await getAuthContext();

  if (!context) {
    await supabase.auth.signOut();
    return {
      error: "অ্যাকাউন্টটি কোনো সক্রিয় কেন্দ্রের সঙ্গে যুক্ত নয়। প্রশাসকের সঙ্গে যোগাযোগ করুন।",
    };
  }

  redirect(getMfaStep(context) ?? ROLE_HOME[context.role]);
}
