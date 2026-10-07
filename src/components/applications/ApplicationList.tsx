import Link from "next/link";
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileCheck2,
  FileEdit,
  FileSearch,
  Files,
  Phone,
  ReceiptText,
  UserRound,
} from "lucide-react";
import { StatusActionButton } from "./StatusActionButton";
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

const statusContent: Record<
  ApplicationStatus,
  { label: string; className: string }
> = {
  draft: { label: "খসড়া", className: "bg-slate-100 text-slate-700" },
  submitted: { label: "অপেক্ষমাণ", className: "bg-amber-50 text-amber-800" },
  in_progress: { label: "চলমান", className: "bg-blue-50 text-blue-800" },
  completed: { label: "সম্পন্ন", className: "bg-emerald-50 text-emerald-800" },
  cancelled_by_approval: { label: "অনুমোদিত বাতিল", className: "bg-rose-50 text-rose-800" },
};

export function ApplicationList({
  applications,
  mode,
}: {
  applications: ApplicationListItem[];
  mode: "pending" | "completed";
}) {
  if (applications.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
          {mode === "completed" ? <CheckCircle2 className="size-6" /> : <FileSearch className="size-6" />}
        </div>
        <h2 className="mt-4 text-base font-extrabold">
          {mode === "completed" ? "এখনো কোনো সম্পন্ন আবেদন নেই" : "কোনো অপেক্ষমাণ আবেদন নেই"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted">
          {mode === "completed"
            ? "সেবা সম্পন্ন হলে আবেদনগুলো এখানে দেখা যাবে।"
            : "নতুন আবেদন গ্রহণ করা হলে সেটি এখানে দেখা যাবে।"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {applications.map((application) => {
        const status = statusContent[application.status];

        return (
          <article key={application.id} className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm shadow-slate-200/30">
            <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                {application.status === "completed" ? <CheckCircle2 className="size-5" /> : <ClipboardList className="size-5" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-extrabold sm:text-base">{application.serviceName}</h2>
                  <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${status.className}`}>{status.label}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-muted">
                  <span className="font-mono font-semibold text-foreground">{application.trackingId}</span>
                  <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" /> {dateTime.format(new Date(application.createdAt))}</span>
                </div>
              </div>

              <div className="grid gap-2 text-xs sm:grid-cols-2 lg:w-[340px]">
                <div className="flex items-center gap-2 rounded-lg bg-[#f7faf8] px-3 py-2.5">
                  <UserRound className="size-3.5 shrink-0 text-brand" />
                  <span className="truncate font-semibold">{application.citizenName}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-[#f7faf8] px-3 py-2.5">
                  <Phone className="size-3.5 shrink-0 text-brand" />
                  <span className="font-mono font-semibold">{application.citizenMobile}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-4 border-t border-border bg-[#fbfcfb] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px]">
                <span className="text-muted">সরকারি ফি <strong className="ml-1 text-foreground">{money.format(application.governmentFee)}</strong></span>
                <span className="text-muted">সহায়তা ও অতিরিক্ত <strong className="ml-1 text-foreground">{money.format(application.assistanceFee + application.additionalFee)}</strong></span>
                <span className="text-muted">মোট <strong className="ml-1 text-brand">{money.format(application.totalFee)}</strong></span>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Link href={`/operator/consent-form/${application.id}`} className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-[10px] font-bold text-muted hover:border-brand/30 hover:text-brand">
                  <FileCheck2 className="size-3.5" /> সম্মতিপত্র
                </Link>
                <Link href={`/operator/applications/${application.id}/documents`} className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-[10px] font-bold text-muted hover:border-brand/30 hover:text-brand">
                  <Files className="size-3.5" /> নথি
                </Link>
                <Link href={`/operator/edit-requests/new?application=${application.id}`} className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-[10px] font-bold text-muted hover:border-brand/30 hover:text-brand">
                  <FileEdit className="size-3.5" /> সংশোধন অনুরোধ
                </Link>
                {mode === "pending" ? (
                  <StatusActionButton applicationId={application.id} currentStatus={application.status} />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted">{application.receiptNumber}</span>
                    <Link href={`/operator/print-receipt/${application.id}`} className="flex h-9 items-center gap-2 rounded-lg bg-brand px-3 text-[10px] font-bold text-white transition hover:bg-brand-dark">
                      <ReceiptText className="size-3.5" /> রশিদ প্রিন্ট
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
