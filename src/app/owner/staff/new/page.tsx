import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck, UserPlus } from "lucide-react";
import { StaffInviteForm } from "@/components/staff/StaffInviteForm";
import { requireRole } from "@/lib/auth/session";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "নতুন কর্মচারী",
  description: "নিরাপদ আমন্ত্রণ দিয়ে নতুন অপারেটর অ্যাকাউন্ট তৈরি করুন",
};

export default async function NewStaffPage() {
  await requireRole(["owner"]);
  const configured = Boolean(
    isSupabaseAdminConfigured() && process.env.NEXT_PUBLIC_SITE_URL,
  );

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/owner/staff" className="mb-5 flex w-fit items-center gap-2 text-xs font-bold text-muted hover:text-brand"><ArrowRight className="size-4" /> কর্মচারী তালিকায় ফিরুন</Link>
      <div className="mb-7">
        <div className="flex items-center gap-2 text-xs font-bold text-brand"><UserPlus className="size-4" /> নিরাপদ আমন্ত্রণ</div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">নতুন কর্মচারী যুক্ত করুন</h1>
        <p className="mt-2 text-sm leading-7 text-muted">পাসওয়ার্ড সংগ্রহ না করে ইমেইল আমন্ত্রণের মাধ্যমে অপারেটর অ্যাকাউন্ট তৈরি করুন।</p>
      </div>
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-[11px] leading-6 text-emerald-900"><ShieldCheck className="mt-0.5 size-4 shrink-0" /> নতুন অ্যাকাউন্ট সবসময় অপারেটর হিসেবে তৈরি হয়। কেন্দ্র পরিচালক বা সুপার অ্যাডমিনের ভূমিকা আমন্ত্রণ ফরম থেকে দেওয়া যায় না।</div>
      <StaffInviteForm configured={configured} />
    </div>
  );
}
