import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MfaPageShell } from "@/components/auth/MfaPageShell";
import { TotpVerifyForm } from "@/components/auth/TotpVerifyForm";
import { getAuthContext } from "@/lib/auth/session";
import { ROLE_HOME } from "@/types/auth";

export const metadata: Metadata = {
  title: "২এফএ যাচাই",
  description: "Authenticator অ্যাপের কোড দিয়ে লগইন যাচাই করুন",
};

export default async function TwoFactorVerifyPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");

  const homePath = ROLE_HOME[context.role];

  if (!context.hasVerifiedTotp) redirect("/2fa-setup");
  if (context.currentAssuranceLevel === "aal2") redirect(homePath);

  return (
    <MfaPageShell
      eyebrow="দ্বি-ধাপ যাচাই"
      title={`স্বাগতম, ${context.fullName}`}
      description="আপনার Authenticator অ্যাপে বর্তমানে দেখানো ৬ সংখ্যার নিরাপত্তা কোডটি লিখুন।"
    >
      <TotpVerifyForm homePath={homePath} />
    </MfaPageShell>
  );
}
