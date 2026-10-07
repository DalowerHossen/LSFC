"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, Save } from "lucide-react";
import { updateLicenseFeeAction, updateServiceFeeAction, type FeeActionState } from "@/app/superadmin/fees/actions";

const initialState: FeeActionState = {};

export function ServiceFeeForm({ serviceCode, locationType, assistanceFee, extraPageFee }: { serviceCode: string; locationType: string; assistanceFee: number; extraPageFee: number }) {
  const [state, action, pending] = useActionState(updateServiceFeeAction, initialState);
  return <form action={action} className="grid gap-3 rounded-xl border border-border bg-[#f7faf8] p-4 sm:grid-cols-2">
    <input type="hidden" name="serviceCode" value={serviceCode} /><input type="hidden" name="locationType" value={locationType} />
    <NumberField name="assistanceFee" label="সহায়তা ফি" defaultValue={assistanceFee} />
    <NumberField name="extraPageFee" label="অতিরিক্ত পৃষ্ঠা ফি" defaultValue={extraPageFee} />
    <div className="sm:col-span-2"><label className="mb-1.5 block text-[10px] font-bold text-muted">পরিবর্তনের কারণ</label><input name="reason" required minLength={10} maxLength={500} placeholder="কমপক্ষে ১০ অক্ষরে কারণ লিখুন" className="h-10 w-full rounded-lg border border-border bg-white px-3 text-xs outline-none focus:border-brand" /></div>
    <Result state={state} /><button disabled={pending} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-xs font-bold text-white disabled:opacity-60">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} সংরক্ষণ</button>
  </form>;
}

export function LicenseFeeForm({ locationType, fee }: { locationType: string; fee: number }) {
  const [state, action, pending] = useActionState(updateLicenseFeeAction, initialState);
  return <form action={action} className="mt-4 space-y-3"><input type="hidden" name="locationType" value={locationType} /><NumberField name="fee" label="লাইসেন্স ফি" defaultValue={fee} /><div><label className="mb-1.5 block text-[10px] font-bold text-muted">পরিবর্তনের কারণ</label><input name="reason" required minLength={10} maxLength={500} placeholder="কমপক্ষে ১০ অক্ষরে কারণ" className="h-10 w-full rounded-lg border border-border px-3 text-xs outline-none focus:border-brand" /></div><Result state={state} /><button disabled={pending} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 text-xs font-bold text-white disabled:opacity-60">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} লাইসেন্স ফি সংরক্ষণ</button></form>;
}

function NumberField({ name, label, defaultValue }: { name: string; label: string; defaultValue: number }) { return <div><label className="mb-1.5 block text-[10px] font-bold text-muted">{label}</label><div className="relative"><span className="absolute top-1/2 left-3 -translate-y-1/2 text-xs font-bold text-brand">৳</span><input name={name} type="number" min="0" max="1000000" step="0.01" required defaultValue={defaultValue} className="h-10 w-full rounded-lg border border-border bg-white pr-3 pl-8 text-xs font-bold outline-none focus:border-brand" /></div></div>; }
function Result({ state }: { state: FeeActionState }) { if (!state.error && !state.success) return <div />; const error = Boolean(state.error); return <div role="status" className={`flex items-center gap-2 text-[10px] font-semibold ${error ? "text-red-700" : "text-emerald-700"}`}>{error ? <AlertCircle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}{state.error ?? state.success}</div>; }
