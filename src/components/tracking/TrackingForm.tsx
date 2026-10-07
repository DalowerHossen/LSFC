"use client";

import { useActionState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  LoaderCircle,
  Phone,
  ReceiptText,
  RotateCcw,
  Search,
} from "lucide-react";
import { trackApplicationAction } from "@/app/actions/tracking";
import type { ApplicationStatus } from "@/types/application";
import type { TrackingState } from "@/types/tracking";

const initialState: TrackingState = {};
const money = new Intl.NumberFormat("bn-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 2,
});
const dateTime = new Intl.DateTimeFormat("bn-BD", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const statusLabels: Record<ApplicationStatus, string> = {
  draft: "খসড়া",
  submitted: "আবেদন গৃহীত",
  in_progress: "সেবা চলমান",
  completed: "সেবা সম্পন্ন",
  cancelled_by_approval: "অনুমোদিত বাতিল",
};

export function TrackingForm({ defaultTrackingId = "" }: { defaultTrackingId?: string }) {
  const [state, formAction, pending] = useActionState(
    trackApplicationAction,
    initialState,
  );

  if (state.result) {
    const result = state.result;
    const progress =
      result.status === "completed" ? 3 : result.status === "in_progress" ? 2 : 1;

    return (
      <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="bg-emerald-50 px-6 py-7 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-600 text-white">
            <FileCheck2 className="size-7" />
          </div>
          <p className="mt-4 text-xs font-bold text-emerald-800">আবেদন পাওয়া গেছে</p>
          <h2 className="mt-1 text-xl font-extrabold text-emerald-950">
            {statusLabels[result.status]}
          </h2>
        </div>

        <div className="space-y-3 p-5 sm:p-7">
          <Info icon={ReceiptText} label="ট্র্যাকিং আইডি" value={result.trackingId} mono />
          <Info icon={Building2} label="সেবা কেন্দ্র" value={result.centerName} />
          <Info icon={FileCheck2} label="সেবা" value={result.serviceName} />
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#f5f8f6] p-4">
            <div>
              <p className="text-[10px] text-muted">রশিদ নম্বর</p>
              <p className="mt-1 break-all font-mono text-xs font-bold">
                {result.receiptNumber ?? "প্রস্তুত হয়নি"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted">মোট ফি</p>
              <p className="mt-1 text-base font-extrabold text-brand">
                {money.format(result.totalFee)}
              </p>
            </div>
          </div>

          {result.status === "cancelled_by_approval" ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
              আবেদনটি অনুমোদিত প্রক্রিয়ায় বাতিল করা হয়েছে। বিস্তারিত জানতে সেবা কেন্দ্রে যোগাযোগ করুন।
            </div>
          ) : (
            <div className="pt-3">
              <h3 className="text-xs font-extrabold">আবেদনের অগ্রগতি</h3>
              <div className="mt-4 grid grid-cols-3">
                {[
                  ["গৃহীত", 1],
                  ["চলমান", 2],
                  ["সম্পন্ন", 3],
                ].map(([label, step], index) => {
                  const reached = progress >= Number(step);
                  return (
                    <div key={label as string} className="relative text-center">
                      {index < 2 && (
                        <div className={`absolute top-3 left-1/2 h-0.5 w-full ${progress > Number(step) ? "bg-brand" : "bg-border"}`} />
                      )}
                      <div className={`relative mx-auto grid size-6 place-items-center rounded-full border-2 ${reached ? "border-brand bg-brand text-white" : "border-border bg-white text-muted"}`}>
                        {reached ? <Check className="size-3" strokeWidth={3} /> : <Clock3 className="size-3" />}
                      </div>
                      <p className={`mt-2 text-[10px] font-bold ${reached ? "text-brand" : "text-muted"}`}>{label as string}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="pt-3 text-center text-[10px] leading-5 text-muted">
            সর্বশেষ Update: {dateTime.format(new Date(result.updatedAt))}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand/20 text-xs font-bold text-brand hover:bg-brand-soft"
          >
            <RotateCcw className="size-4" /> অন্য আবেদন খুঁজুন
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {state.error && (
        <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs leading-6 text-red-800">
          <AlertCircle className="mt-1 size-4 shrink-0" /> {state.error}
        </div>
      )}

      <div>
        <label htmlFor="trackingId" className="mb-2 block text-sm font-bold">
          ট্র্যাকিং আইডি
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
          <input
            id="trackingId"
            name="trackingId"
            defaultValue={defaultTrackingId.toUpperCase()}
            required
            maxLength={15}
            placeholder="LS-XXXXXXXXXXXX"
            autoComplete="off"
            className="h-13 w-full rounded-xl border border-border bg-white pr-4 pl-11 font-mono text-sm font-bold uppercase outline-none focus:border-brand focus:ring-3 focus:ring-brand/10"
          />
        </div>
      </div>

      <div>
        <label htmlFor="mobile" className="mb-2 block text-sm font-bold">
          আবেদনে ব্যবহৃত মোবাইল নম্বর
        </label>
        <div className="relative">
          <Phone className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
          <input
            id="mobile"
            name="mobile"
            required
            inputMode="numeric"
            pattern="01[3-9][0-9]{8}"
            maxLength={11}
            placeholder="01XXXXXXXXX"
            className="h-13 w-full rounded-xl border border-border bg-white pr-4 pl-11 font-mono text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/10"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-lg shadow-brand/15 hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? (
          <><LoaderCircle className="size-4 animate-spin" /> খোঁজা হচ্ছে…</>
        ) : (
          <>আবেদনের অবস্থা দেখুন <ArrowLeft className="size-4" /></>
        )}
      </button>

      <div className="flex items-start gap-2 rounded-xl bg-brand-soft/60 p-3.5 text-[10px] leading-5 text-muted">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" /> নিরাপত্তার জন্য ট্র্যাকিং আইডি ও সঠিক মোবাইল নম্বর—দুটিই মিলতে হবে।
      </div>
    </form>
  );
}

function Info({ icon: Icon, label, value, mono = false }: { icon: typeof ReceiptText; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3.5">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><Icon className="size-4" /></div>
      <div className="min-w-0"><p className="text-[10px] text-muted">{label}</p><p className={`mt-1 break-words text-xs font-bold ${mono ? "font-mono" : ""}`}>{value}</p></div>
    </div>
  );
}
