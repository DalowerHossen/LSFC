import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CircleX,
  FileCheck2,
  Landmark,
  ReceiptText,
} from "lucide-react";
import { GovernmentMark } from "@/components/common/GovernmentMark";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/types/application";
import type { VerifiedReceipt } from "@/types/receipt";

export const metadata: Metadata = {
  title: "রশিদ যাচাই",
  description: "QR কোডের মাধ্যমে ভূমিসেবা সহায়তা কেন্দ্রের রশিদ যাচাই করুন",
};

type VerificationRow = {
  is_valid: boolean;
  receipt_number: string;
  center_name: string;
  service_name: string;
  total_fee: number | string;
  application_status: ApplicationStatus;
  issued_at: string;
  receipt_version: number;
  is_current_version: boolean;
};

const money = new Intl.NumberFormat("bn-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 2,
});

const statusLabels: Record<ApplicationStatus, string> = {
  draft: "খসড়া",
  submitted: "আবেদন গৃহীত",
  in_progress: "সেবা চলমান",
  completed: "সেবা সম্পন্ন",
  cancelled_by_approval: "অনুমোদিত বাতিল",
};

export default async function VerifyReceiptPage({
  params,
}: {
  params: Promise<{ qr: string }>;
}) {
  const { qr } = await params;
  let receipt: VerifiedReceipt | null = null;

  if (hasSupabasePublicEnv() && /^[a-f0-9]{64}$/.test(qr)) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("verify_receipt", {
      p_verification_token: qr,
    });
    const row = (Array.isArray(data) ? data[0] : data) as VerificationRow | null;

    if (row?.is_valid) {
      receipt = {
        isValid: true,
        receiptNumber: row.receipt_number,
        centerName: row.center_name,
        serviceName: row.service_name,
        totalFee: Number(row.total_fee),
        applicationStatus: row.application_status,
        issuedAt: row.issued_at,
        receiptVersion: row.receipt_version,
        isCurrentVersion: row.is_current_version,
      };
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f7f5] px-5 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/"><GovernmentMark compact /></Link>
          <Link href="/" className="flex items-center gap-2 text-xs font-bold text-muted hover:text-brand"><ArrowRight className="size-4" /> হোমে ফিরুন</Link>
        </div>

        <section className="mt-10 overflow-hidden rounded-3xl border border-border bg-white shadow-xl shadow-brand/5">
          {receipt ? (
            <>
              <div className="bg-emerald-50 px-6 py-9 text-center sm:px-10">
                <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-200"><BadgeCheck className="size-8" /></div>
                <h1 className="mt-5 text-2xl font-extrabold text-emerald-950">রশিদটি বৈধ</h1>
                <p className="mt-2 text-sm text-emerald-800/70">রশিদের তথ্য অপরিবর্তনীয় ডিজিটাল প্রতিলিপি-এর সঙ্গে মিলেছে।</p>
              </div>
              <div className="space-y-3 p-6 sm:p-8">
                {!receipt.isCurrentVersion && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
                    এটি বৈধ পুরোনো receipt সংস্করণ। সংশোধনের পর নতুন সংস্করণ ইস্যু করা হয়েছে।
                  </div>
                )}
                <VerificationItem icon={ReceiptText} label={`রশিদ নম্বর • Version ${receipt.receiptVersion}`} value={receipt.receiptNumber} mono />
                <VerificationItem icon={Landmark} label="সেবা কেন্দ্র" value={receipt.centerName} />
                <VerificationItem icon={FileCheck2} label="সেবা" value={receipt.serviceName} />
                <VerificationItem icon={CalendarDays} label="ইস্যুর তারিখ" value={new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(receipt.issuedAt))} />
                <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-[#f5f8f6] p-4">
                  <div><p className="text-[10px] text-muted">বর্তমান অবস্থা</p><p className="mt-1 text-sm font-extrabold text-brand">{statusLabels[receipt.applicationStatus]}</p></div>
                  <div className="text-right"><p className="text-[10px] text-muted">মোট ফি</p><p className="mt-1 text-lg font-extrabold text-brand">{money.format(receipt.totalFee)}</p></div>
                </div>
                <p className="pt-3 text-center text-[10px] leading-5 text-muted">নাগরিকের গোপনীয়তা রক্ষায় এই পেজে নাম বা মোবাইল নম্বর প্রকাশ করা হয় না।</p>
              </div>
            </>
          ) : (
            <div className="px-6 py-14 text-center sm:px-10">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-red-50 text-red-600"><CircleX className="size-8" /></div>
              <h1 className="mt-5 text-2xl font-extrabold">রশিদ যাচাই করা যায়নি</h1>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-muted">কিউআর কোডটি সঠিক নয়, রশিদটি পাওয়া যায়নি অথবা যাচাই সেবা এখনো সংযুক্ত হয়নি।</p>
              <Link href="/" className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white">হোম পেজে ফিরে যান</Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function VerificationItem({ icon: Icon, label, value, mono = false }: { icon: typeof ReceiptText; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-4">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><Icon className="size-4" /></div>
      <div className="min-w-0"><p className="text-[10px] text-muted">{label}</p><p className={`mt-1 break-words text-sm font-bold ${mono ? "font-mono" : ""}`}>{value}</p></div>
    </div>
  );
}
