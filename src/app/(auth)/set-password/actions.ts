"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext, getMfaStep } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME } from "@/types/auth";

export type PasswordState = { error?: string };

const passwordSchema = z
  .object({
    password: z.string().min(10, "Password কমপক্ষে ১০ অক্ষরের হতে হবে").max(128),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "দুইটি Password একই নয়",
  });

export async function setPasswordAction(
  _previousState: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const context = await getAuthContext();
  if (!context) redirect("/login");

  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Password যাচাই করুন" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { error: "Password সেট করা যায়নি। Invitation link আবার খুলুন।" };

  redirect(getMfaStep(context) ?? ROLE_HOME[context.role]);
}
