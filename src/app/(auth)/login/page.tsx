import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { GovernmentMark } from "@/components/common/GovernmentMark";
import { getAuthContext, getMfaStep } from "@/lib/auth/session";
import { hasSupabasePublicEnv } from "@/lib/env";
import { ROLE_HOME } from "@/types/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "কেন্দ্র লগইন",
  description: "ভূমিসেবা সহায়তা কেন্দ্র ব্যবস্থাপনা সিস্টেমে নিরাপদ লগইন",
};

export default async function LoginPage() {
  const configured = hasSupabasePublicEnv();
  const context = await getAuthContext();

  if (context) redirect(getMfaStep(context) ?? ROLE_HOME[context.role]);

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[.92fr_1.08fr]">
      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="হোম পেজ">
            <GovernmentMark compact />
          </Link>
          <Link href="/" className="flex items-center gap-2 text-xs font-bold text-muted hover:text-brand">
            <ArrowRight className="size-4" /> হোমে ফিরুন
          </Link>
        </div>

        <div className="mx-auto my-auto w-full max-w-md py-14">
          <div className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
            <ShieldCheck className="size-6" aria-hidden="true" />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
            আপনার অ্যাকাউন্টে লগইন করুন
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted">
            অনুমোদিত কেন্দ্রের ইমেইল ও পাসওয়ার্ড ব্যবহার করুন।
          </p>
          <LoginForm configured={configured} />
          <p className="mt-6 text-center text-xs leading-6 text-muted">
            লগইন করে আপনি প্ল্যাটফর্মের নিরাপত্তা নীতিমালা মেনে চলতে সম্মত হচ্ছেন।
          </p>
        </div>
      </section>

      <section className="relative hidden overflow-hidden bg-[#0a3529] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -top-32 -right-24 size-96 rounded-full bg-[#14946f]/35 blur-3xl" />
        <div className="absolute -bottom-28 -left-24 size-80 rounded-full bg-accent/15 blur-3xl" />
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-20" />

        <div className="relative flex justify-end">
          <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white/75 backdrop-blur-sm">
            প্রথম ধাপ • নিরাপদ Authentication
          </span>
        </div>

        <div className="relative max-w-xl">
          <p className="text-sm font-bold text-[#7fe0bd]">কেন্দ্র ব্যবস্থাপনা</p>
          <h2 className="mt-4 text-4xl leading-tight font-extrabold xl:text-5xl">
            একটি লগইন,
            <span className="block text-[#7fe0bd]">সম্পূর্ণ কার্যক্রম</span>
          </h2>
          <p className="mt-6 max-w-lg text-sm leading-8 text-white/65 xl:text-base">
            আবেদন, আর্থিক হিসাব, কর্মচারী ও সরকারি প্রতিবেদন—কেন্দ্রের অনুমতি অনুযায়ী নিরাপদ প্রবেশ।
          </p>
          <ul className="mt-9 grid gap-4">
            {[
              "কেন্দ্রভিত্তিক কঠোর তথ্য পৃথকীকরণ",
              "ভূমিকা অনুযায়ী প্রবেশাধিকার",
              "টিওটিপি-কে অগ্রাধিকার দেওয়া স্মার্ট ২এফএ প্রস্তুতি",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm font-semibold text-white/80">
                <CheckCircle2 className="size-5 shrink-0 text-[#7fe0bd]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">
          প্রতিটি লগইন ও গুরুত্বপূর্ণ কার্যক্রম নিরীক্ষাযোগ্য রাখা হবে।
        </p>
      </section>
    </main>
  );
}
