import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MfaPageShell } from "@/components/auth/MfaPageShell";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";
import { getAuthContext } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "পাসওয়ার্ড সেটআপ",
  description: "আমন্ত্রিত account-এর নিরাপদ পাসওয়ার্ড তৈরি করুন",
};

export default async function SetPasswordPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");

  return (
    <MfaPageShell
      eyebrow="Account activation"
      title={`স্বাগতম, ${context.fullName}`}
      description="আপনার অপারেটর অ্যাকাউন্ট সক্রিয় করতে একটি শক্তিশালী পাসওয়ার্ড তৈরি করুন।"
    >
      <SetPasswordForm />
    </MfaPageShell>
  );
}
