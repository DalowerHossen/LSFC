import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { GovernmentMark } from "@/components/common/GovernmentMark";

export const metadata: Metadata = { title: "পাসওয়ার্ড পুনরুদ্ধার" };
export default function ForgotPasswordPage() {
  return <main className="grid min-h-screen place-items-center bg-[#f3f7f5] px-5 py-12"><section className="w-full max-w-md rounded-3xl border border-border bg-white p-7 shadow-xl shadow-brand/5 sm:p-9"><GovernmentMark /><div className="mt-8 grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand"><KeyRound className="size-6" /></div><h1 className="mt-5 text-2xl font-extrabold">পাসওয়ার্ড পুনরুদ্ধার</h1><p className="mt-2 text-sm leading-7 text-muted">আপনার নিবন্ধিত ইমেইলে একবার ব্যবহারযোগ্য নিরাপদ লিংক পাঠানো হবে।</p><ForgotPasswordForm /><Link href="/account-recovery" className="mt-5 block text-center text-xs font-bold text-brand">ইমেইল recovery কাজ করছে না?</Link></section></main>;
}
