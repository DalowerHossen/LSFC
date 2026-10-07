"use client";

import { useActionState } from "react";
import { LoaderCircle, Save, Upload } from "lucide-react";
import { savePrintSettingsAction,uploadCenterLogoAction, type PrintSettingsState } from "@/app/owner/print-settings/actions";
import type { ReceiptFormat } from "@/types/receipt";

const initial: PrintSettingsState = {};
export function PrintSettingsForm({ settings }: { settings: { defaultFormat: ReceiptFormat; headerText: string; footerMessage: string; showCenterPhone: boolean } }) {
  const [state, action, pending] = useActionState(savePrintSettingsAction, initial);
  return <form action={action} className="max-w-2xl space-y-5 rounded-2xl border border-border bg-white p-6 shadow-sm">
    <fieldset><legend className="text-sm font-extrabold">ডিফল্ট কাগজের মাপ</legend><div className="mt-3 grid gap-3 sm:grid-cols-3">{[["58mm","৫৮ মিমি"],["80mm","৮০ মিমি"],["a4-half","অর্ধেক এ৪"]].map(([value,label]) => <label key={value} className="flex items-center gap-2 rounded-xl border border-border p-3 text-xs font-bold"><input type="radio" name="defaultFormat" value={value} defaultChecked={settings.defaultFormat === value} className="accent-brand" /> {label}</label>)}</div></fieldset>
    <label className="block text-xs font-bold">অতিরিক্ত শিরোনাম (ঐচ্ছিক)<input name="headerText" defaultValue={settings.headerText} minLength={2} maxLength={120} placeholder="যেমন: নাগরিক সেবা—আমাদের অঙ্গীকার" className="mt-2 h-11 w-full rounded-xl border border-border px-3 text-xs outline-none focus:border-brand" /></label>
    <label className="block text-xs font-bold">রশিদের নিচের বার্তা (ঐচ্ছিক)<textarea name="footerMessage" defaultValue={settings.footerMessage} minLength={2} maxLength={300} placeholder="নাগরিকের জন্য সংক্ষিপ্ত বার্তা" className="mt-2 min-h-24 w-full rounded-xl border border-border p-3 text-xs outline-none focus:border-brand" /></label>
    <label className="flex items-center gap-2 text-xs font-bold"><input name="showCenterPhone" type="checkbox" defaultChecked={settings.showCenterPhone} className="accent-brand" /> কেন্দ্রের মোবাইল নম্বর রশিদে দেখান</label>
    {(state.error || state.success) && <p className={`text-xs font-semibold ${state.error ? "text-red-700" : "text-emerald-700"}`}>{state.error ?? state.success}</p>}
    <button disabled={pending} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-xs font-bold text-white disabled:opacity-60">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} সেটিংস সংরক্ষণ</button>
  </form>;
}
export function CenterLogoForm({logoId}:{logoId:string|null}){const[state,action,pending]=useActionState(uploadCenterLogoAction,initial);return <form action={action} className="mt-5 max-w-2xl rounded-2xl border border-border bg-white p-6 shadow-sm"><h2 className="text-sm font-extrabold">রশিদের কেন্দ্র লোগো</h2><p className="mt-1 text-[10px] leading-5 text-muted">PNG, JPEG অথবা WebP; সর্বোচ্চ ২ মেগাবাইট। ফাইলটি AES-256-GCM দিয়ে এনক্রিপ্ট হবে। নতুন লোগো দিলে আগের সংস্করণ নিরীক্ষার জন্য অপরিবর্তিত থাকবে।</p>{logoId&&<div className="mt-4 flex items-center gap-4 rounded-xl bg-[#f7faf8] p-4"><img src={`/api/center-assets/${logoId}`} alt="বর্তমান কেন্দ্র লোগো" className="size-16 object-contain"/><span className="text-xs font-bold text-emerald-700">বর্তমান লোগো সক্রিয়</span></div>}<input name="logo" type="file" required accept="image/png,image/jpeg,image/webp" className="mt-4 block w-full rounded-xl border border-border p-3 text-xs"/>{(state.error||state.success)&&<p className={`mt-3 text-xs font-semibold ${state.error?"text-red-700":"text-emerald-700"}`}>{state.error??state.success}</p>}<button disabled={pending} className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-xs font-bold text-white disabled:opacity-60">{pending?<LoaderCircle className="size-4 animate-spin"/>:<Upload className="size-4"/>}এনক্রিপ্ট করে লোগো সংরক্ষণ</button></form>}
