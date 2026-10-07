import {
  CheckCircle2,
  Clock3,
  FileSearch,
  Phone,
  ReceiptText,
  UserRound,
} from "lucide-react";
import type {
  ApplicationListItem,
  ApplicationStatus,
} from "@/types/application";

const money = new Intl.NumberFormat("bn-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 2,
});
const dateTime = new Intl.DateTimeFormat("bn-BD", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const statusContent: Record<ApplicationStatus, { label: string; className: string }> = {
  draft: { label: "খসড়া", className: "bg-slate-100 text-slate-700" },
  submitted: { label: "অপেক্ষমাণ", className: "bg-amber-50 text-amber-800" },
  in_progress: { label: "চলমান", className: "bg-blue-50 text-blue-800" },
  completed: { label: "সম্পন্ন", className: "bg-emerald-50 text-emerald-800" },
  cancelled_by_approval: { label: "বাতিল", className: "bg-red-50 text-red-700" },
};

export function OwnerApplicationTable({ applications }: { applications: ApplicationListItem[] }) {
  if (applications.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
        <FileSearch className="mx-auto size-9 text-brand/50" />
        <h2 className="mt-4 text-base font-extrabold">কোনো আবেদন পাওয়া যায়নি</h2>
        <p className="mt-2 text-xs text-muted">নির্বাচিত filter অনুযায়ী কোনো তথ্য নেই।</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="hidden grid-cols-[1.3fr_1fr_.8fr_.7fr] gap-4 border-b border-border bg-[#f7faf8] px-5 py-3 text-[10px] font-bold text-muted lg:grid">
        <span>আবেদন ও সেবা</span><span>নাগরিক</span><span>অবস্থা</span><span className="text-right">মোট ফি</span>
      </div>
      <div className="divide-y divide-border">
        {applications.map((application) => {
          const status = statusContent[application.status];
          return (
            <article key={application.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[1.3fr_1fr_.8fr_.7fr] lg:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">{application.serviceName}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
                  <span className="font-mono text-foreground">{application.trackingId}</span>
                  <span className="flex items-center gap-1"><Clock3 className="size-3" />{dateTime.format(new Date(application.createdAt))}</span>
                </div>
              </div>
              <div className="space-y-1 text-[11px]">
                <p className="flex items-center gap-2 font-semibold"><UserRound className="size-3.5 text-brand" />{application.citizenName}</p>
                <p className="flex items-center gap-2 font-mono text-muted"><Phone className="size-3.5 text-brand" />{application.citizenMobile}</p>
              </div>
              <div>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold ${status.className}`}>{status.label}</span>
                {application.receiptNumber && <p className="mt-1.5 flex items-center gap-1 font-mono text-[9px] text-muted"><ReceiptText className="size-3" />{application.receiptNumber}</p>}
              </div>
              <div className="flex items-center justify-between lg:block lg:text-right">
                <span className="text-[10px] text-muted lg:hidden">মোট ফি</span>
                <p className="text-sm font-extrabold text-brand">{money.format(application.totalFee)}</p>
                {application.status === "completed" && <p className="mt-1 flex items-center justify-end gap-1 text-[9px] font-bold text-emerald-700"><CheckCircle2 className="size-3" /> সেবা শেষ</p>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
