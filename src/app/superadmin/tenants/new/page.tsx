import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
import { CenterCreateForm } from "@/components/centers/CenterCreateForm";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "নতুন কেন্দ্র" };

export default async function NewTenantPage() {
  await requireRole(["super_admin"]);
  return <div className="mx-auto max-w-4xl"><Link href="/superadmin/tenants" className="mb-5 flex w-fit items-center gap-2 text-xs font-bold text-muted hover:text-brand"><ArrowRight className="size-4" /> কেন্দ্র তালিকায় ফিরুন</Link><div className="mb-7"><div className="flex items-center gap-2 text-xs font-bold text-brand"><Building2 className="size-4" /> Tenant onboarding</div><h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">নতুন কেন্দ্র তৈরি</h1><p className="mt-2 text-sm leading-7 text-muted">যাচাইয়ের জন্য কেন্দ্রের তথ্য যোগ করুন। তৈরি হওয়ার পর আলাদাভাবে অনুমোদন দিতে হবে।</p></div><div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-[11px] leading-6 text-blue-900"><ShieldCheck className="mt-0.5 size-4 shrink-0" /> কেন্দ্র সরাসরি সক্রিয় হবে না। Status history ও audit log-এ প্রতিটি সিদ্ধান্ত স্থায়ীভাবে সংরক্ষিত থাকবে।</div><CenterCreateForm /></div>;
}
