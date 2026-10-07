import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MfaPageShell } from "@/components/auth/MfaPageShell";
import { TotpSetupForm } from "@/components/auth/TotpSetupForm";
import { getAuthContext } from "@/lib/auth/session";
import { ROLE_HOME } from "@/types/auth";

export const metadata: Metadata = {
  title: "২এফএ সেটআপ",
  description: "Authenticator অ্যাপ দিয়ে নিরাপদ দ্বি-ধাপ যাচাই সেটআপ করুন",
};

export default async function TwoFactorSetupPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");

  const homePath = ROLE_HOME[context.role];

  if (context.hasVerifiedTotp) {
    redirect(context.currentAssuranceLevel === "aal2" ? homePath : "/2fa-verify");
  }

  return (
    <MfaPageShell
      eyebrow="প্রথমবারের নিরাপত্তা সেটআপ"
      title="Authenticator অ্যাপ যুক্ত করুন"
      description="টিওটিপি কোডকে অগ্রাধিকার দেওয়ায় WhatsApp বা SMS খরচ ছাড়াই নিরাপদে লগইন করা যাবে।"
    >
      <TotpSetupForm homePath={homePath} />
    </MfaPageShell>
  );
}
