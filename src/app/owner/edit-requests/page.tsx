import type { Metadata } from "next";
import { FileEdit, ShieldCheck } from "lucide-react";
import { CorrectionRequestList } from "@/components/corrections/CorrectionRequestList";
import { requireRole } from "@/lib/auth/session";
import { listCorrectionRequests } from "@/lib/corrections/list";

export const metadata: Metadata = { title: "সংশোধন পর্যালোচনা" };

export default async function OwnerEditRequestsPage() {
  await requireRole(["owner"]);
  const requests = await listCorrectionRequests();
  const pending = requests.filter((item) => item.status === "pending_owner").length;
  return <div><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2 text-xs font-bold text-brand"><FileEdit className="size-4" /> কেন্দ্র পরিচালকের পর্যালোচনা</div><h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">সংশোধন পর্যালোচনা</h1><p className="mt-2 text-sm leading-7 text-muted">অপারেটরের অনুরোধ যাচাই করে প্রত্যাখ্যান করুন অথবা সুপার অ্যাডমিনের কাছে পাঠান।</p></div><span className="flex w-fit items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900"><ShieldCheck className="size-4" /> {new Intl.NumberFormat("bn-BD").format(pending)}টি অপেক্ষমাণ</span></div><CorrectionRequestList requests={requests} ownerReview /></div>;
}
