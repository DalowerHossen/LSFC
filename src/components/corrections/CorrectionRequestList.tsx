import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileEdit,
  UserRound,
  XCircle,
} from "lucide-react";
import { reviewCorrectionAction } from "@/app/owner/edit-requests/actions";
import { superAdminReviewCorrectionAction } from "@/app/superadmin/edit-approvals/actions";
import type { CorrectionRequest, CorrectionStatus } from "@/types/correction";

const dateTime = new Intl.DateTimeFormat("bn-BD", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const fieldLabels = {
  citizen_name: "নাগরিকের নাম",
  citizen_mobile: "মোবাইল নম্বর",
  government_fee: "সরকারি ফি",
};
const statuses: Record<CorrectionStatus, { label: string; className: string }> = {
  pending_owner: { label: "কেন্দ্র পরিচালক-এর অপেক্ষায়", className: "bg-amber-50 text-amber-800" },
  pending_super_admin: { label: "সুপার অ্যাডমিনের অপেক্ষায়", className: "bg-blue-50 text-blue-800" },
  approved: { label: "অনুমোদিত", className: "bg-emerald-50 text-emerald-800" },
  rejected: { label: "প্রত্যাখ্যাত", className: "bg-red-50 text-red-700" },
};

export function CorrectionRequestList({
  requests,
  ownerReview = false,
  superAdminReview = false,
}: {
  requests: CorrectionRequest[];
  ownerReview?: boolean;
  superAdminReview?: boolean;
}) {
  if (requests.length === 0) {
    return <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center"><FileEdit className="mx-auto size-9 text-brand/40" /><h2 className="mt-4 text-base font-extrabold">কোনো সংশোধন অনুরোধ নেই</h2></div>;
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => {
        const status = statuses[request.status];
        return (
          <article key={request.id} className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <div className="p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-extrabold">{request.serviceName}</h2><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${status.className}`}>{status.label}</span></div><p className="mt-2 font-mono text-[10px] text-muted">{request.trackingId}</p></div>
                <div className="text-[10px] text-muted sm:text-right"><p className="flex items-center gap-1.5 sm:justify-end"><UserRound className="size-3" />{request.requestedByName}</p><p className="mt-1 flex items-center gap-1.5 sm:justify-end"><Clock3 className="size-3" />{dateTime.format(new Date(request.createdAt))}</p></div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[.7fr_1fr_1fr]">
                <Value label="সংশোধনের ক্ষেত্র" value={fieldLabels[request.change.field]} />
                <Value label="বর্তমান তথ্য" value={request.change.current_value} muted />
                <Value label="প্রস্তাবিত তথ্য" value={request.change.proposed_value} highlight />
              </div>
              <div className="mt-3 rounded-xl bg-[#f7faf8] p-4"><p className="text-[9px] font-bold text-muted">কারণ</p><p className="mt-1 text-xs leading-6">{request.reason}</p></div>
              {request.reviewNote && <div className="mt-3 text-[10px] leading-5 text-muted"><strong>পর্যালোচনার মন্তব্য:</strong> {request.reviewNote}</div>}
            </div>

            {ownerReview && request.status === "pending_owner" && (
              <form action={reviewCorrectionAction} className="border-t border-border bg-[#fbfcfb] p-4 sm:px-6">
                <input type="hidden" name="requestId" value={request.id} />
                <input name="note" maxLength={500} placeholder="পর্যালোচনা মন্তব্য (ঐচ্ছিক)" className="h-10 w-full rounded-lg border border-border bg-white px-3 text-xs outline-none focus:border-brand" />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button type="submit" name="decision" value="reject" className="flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 text-[10px] font-bold text-red-700 hover:bg-red-50"><XCircle className="size-3.5" /> প্রত্যাখ্যান</button>
                  <button type="submit" name="decision" value="forward" className="flex h-9 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-[10px] font-bold text-white"><ArrowUpRight className="size-3.5" /> সুপার অ্যাডমিনের কাছে পাঠান</button>
                </div>
              </form>
            )}

            {superAdminReview && request.status === "pending_super_admin" && (
              <form action={superAdminReviewCorrectionAction} className="border-t border-border bg-[#fbfcfb] p-4 sm:px-6">
                <div className="mb-3 rounded-lg border border-amber-100 bg-amber-50 p-3 text-[10px] leading-5 text-amber-900">
                  অনুমোদন করলে application-এ সংশোধন প্রয়োগ হবে এবং নতুন immutable receipt সংস্করণ তৈরি হবে।
                </div>
                <input type="hidden" name="requestId" value={request.id} />
                <input name="note" maxLength={500} placeholder="চূড়ান্ত পর্যালোচনা মন্তব্য (ঐচ্ছিক)" className="h-10 w-full rounded-lg border border-border bg-white px-3 text-xs outline-none focus:border-brand" />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button type="submit" name="decision" value="reject" className="flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 text-[10px] font-bold text-red-700 hover:bg-red-50"><XCircle className="size-3.5" /> প্রত্যাখ্যান</button>
                  <button type="submit" name="decision" value="approve" className="flex h-9 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-[10px] font-bold text-white"><CheckCircle2 className="size-3.5" /> অনুমোদন ও প্রয়োগ</button>
                </div>
              </form>
            )}

            {request.status === "approved" && <div className="flex items-center gap-2 border-t border-emerald-100 bg-emerald-50 px-5 py-3 text-[10px] font-bold text-emerald-800"><CheckCircle2 className="size-3.5" /> অনুরোধটি অনুমোদিত ও সংস্করণ হিসেবে প্রয়োগ হয়েছে</div>}
          </article>
        );
      })}
    </div>
  );
}

function Value({ label, value, muted = false, highlight = false }: { label: string; value: string; muted?: boolean; highlight?: boolean }) {
  return <div className={`rounded-xl border p-3 ${highlight ? "border-brand/20 bg-brand-soft/40" : "border-border"}`}><p className="text-[9px] font-bold text-muted">{label}</p><p className={`mt-1 break-words text-xs font-bold ${muted ? "text-muted line-through" : highlight ? "text-brand" : ""}`}>{value}</p></div>;
}
