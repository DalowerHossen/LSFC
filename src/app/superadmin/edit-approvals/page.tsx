import type { Metadata } from "next";
import { FileCheck2, ShieldCheck } from "lucide-react";
import { CorrectionRequestList } from "@/components/corrections/CorrectionRequestList";
import { requireRole } from "@/lib/auth/session";
import { listCorrectionRequests } from "@/lib/corrections/list";

export const metadata: Metadata = { title: "চূড়ান্ত সংশোধন অনুমোদন" };

export default async function SuperAdminEditApprovalsPage() {
  await requireRole(["super_admin"]);
  const requests = await listCorrectionRequests();
  const pending = requests.filter((item) => item.status === "pending_super_admin").length;

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand"><FileCheck2 className="size-4" /> চূড়ান্ত নিয়ন্ত্রণ</div>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">সংশোধন অনুমোদন কেন্দ্র</h1>
          <p className="mt-2 text-sm leading-7 text-muted">কেন্দ্র পরিচালক যাচাই করা অনুরোধের চূড়ান্ত সিদ্ধান্ত দিন এবং সংস্করণভিত্তিক সংশোধন প্রয়োগ করুন।</p>
        </div>
        <span className="flex w-fit items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900"><ShieldCheck className="size-4" /> {new Intl.NumberFormat("bn-BD").format(pending)}টি অপেক্ষমাণ</span>
      </div>
      <CorrectionRequestList requests={requests} superAdminReview />
    </div>
  );
}
