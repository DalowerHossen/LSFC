"use client";

import { useActionState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileEdit,
  LoaderCircle,
  Send,
} from "lucide-react";
import {
  requestCorrectionAction,
  type CorrectionActionState,
} from "@/app/operator/edit-requests/actions";

const initialState: CorrectionActionState = {};

type ApplicationOption = {
  id: string;
  trackingId: string;
  serviceName: string;
};

export function CorrectionRequestForm({
  applications,
  selectedApplicationId,
}: {
  applications: ApplicationOption[];
  selectedApplicationId?: string;
}) {
  const [state, formAction, pending] = useActionState(
    requestCorrectionAction,
    initialState,
  );

  if (state.success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white px-6 py-12 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
        <h2 className="mt-4 text-lg font-extrabold">সংশোধন অনুরোধ পাঠানো হয়েছে</h2>
        <p className="mt-2 text-xs text-muted">কেন্দ্র কেন্দ্র পরিচালক পর্যালোচনা করে সুপার অ্যাডমিনের কাছে পাঠাবেন।</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-brand px-5 py-3 text-xs font-bold text-white">আরেকটি অনুরোধ</button>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-2xl border border-border bg-white shadow-sm">
      <div className="border-b border-border p-5 sm:p-6">
        <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><FileEdit className="size-5" /></div><div><h2 className="text-base font-extrabold">সংশোধনের বিবরণ</h2><p className="mt-1 text-[10px] text-muted">মূল তথ্য সরাসরি পরিবর্তিত হবে না</p></div></div>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        {state.error && <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800"><AlertCircle className="size-4 shrink-0" />{state.error}</div>}
        <div><label htmlFor="applicationId" className="mb-2 block text-sm font-bold">আবেদন</label><select id="applicationId" name="applicationId" required defaultValue={selectedApplicationId ?? ""} className="h-13 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-brand"><option value="" disabled>আবেদন নির্বাচন করুন</option>{applications.map((item) => <option key={item.id} value={item.id}>{item.trackingId} — {item.serviceName}</option>)}</select></div>
        <div><label htmlFor="fieldName" className="mb-2 block text-sm font-bold">যে তথ্য সংশোধন হবে</label><select id="fieldName" name="fieldName" required className="h-13 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-brand"><option value="citizen_name">নাগরিকের নাম</option><option value="citizen_mobile">মোবাইল নম্বর</option><option value="government_fee">সরকারি ফি</option></select></div>
        <div><label htmlFor="proposedValue" className="mb-2 block text-sm font-bold">সঠিক নতুন তথ্য</label><input id="proposedValue" name="proposedValue" required maxLength={120} className="h-13 w-full rounded-xl border border-border px-4 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/10" placeholder="প্রস্তাবিত সঠিক তথ্য" /></div>
        <div><label htmlFor="reason" className="mb-2 block text-sm font-bold">সংশোধনের কারণ</label><textarea id="reason" name="reason" required minLength={10} maxLength={1000} rows={4} className="w-full resize-none rounded-xl border border-border p-4 text-sm leading-6 outline-none focus:border-brand focus:ring-3 focus:ring-brand/10" placeholder="কেন সংশোধন প্রয়োজন তা বিস্তারিত লিখুন" /></div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-[11px] leading-6 text-amber-900">অনুরোধের ধাপ: অপারেটর → কেন্দ্র পরিচালক → সুপার অ্যাডমিন। অনুমোদন না হওয়া পর্যন্ত মূল আবেদন ও রশিদ অপরিবর্তিত থাকবে।</div>
        <button type="submit" disabled={pending || applications.length === 0} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60">{pending ? <><LoaderCircle className="size-4 animate-spin" /> পাঠানো হচ্ছে…</> : <><Send className="size-4" /> কেন্দ্র পরিচালকের কাছে পাঠান</>}</button>
      </div>
    </form>
  );
}
