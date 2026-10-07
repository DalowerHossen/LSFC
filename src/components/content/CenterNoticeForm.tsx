"use client";

import { useActionState } from "react";
import { LoaderCircle, Send } from "lucide-react";
import { saveCenterNoticeAction, type CenterNoticeState } from "@/app/owner/notices/actions";

const initial: CenterNoticeState = {};
const field = "h-11 w-full rounded-xl border border-border bg-white px-3 text-xs outline-none focus:border-brand";

export function CenterNoticeForm() {
  const [state, action, pending] = useActionState(saveCenterNoticeAction, initial);
  return <form action={action} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
    <h2 className="text-sm font-extrabold">কেন্দ্রের কর্মীদের জন্য নোটিশ</h2>
    <p className="mt-1 text-[10px] leading-5 text-muted">প্রকাশিত নোটিশ শুধু এই কেন্দ্রের অপারেটররা দেখতে পাবেন। প্রতিটি পরিবর্তনের সংস্করণ সংরক্ষিত থাকবে।</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <input name="title" required minLength={3} maxLength={160} placeholder="নোটিশের শিরোনাম" className={`${field} sm:col-span-2`} />
      <textarea name="body" required minLength={10} maxLength={5000} placeholder="নোটিশের বিস্তারিত লিখুন" className="min-h-28 w-full rounded-xl border border-border p-3 text-xs outline-none focus:border-brand sm:col-span-2" />
      <label className="text-[10px] font-bold text-muted">গুরুত্ব<select name="priority" className={`mt-1 ${field}`}><option value="0">সাধারণ</option><option value="1">গুরুত্বপূর্ণ</option><option value="2">জরুরি</option><option value="3">অতি জরুরি</option></select></label>
      <span />
      <label className="text-[10px] font-bold text-muted">প্রদর্শন শুরুর সময় (ঐচ্ছিক)<input name="startsAt" type="datetime-local" className={`mt-1 ${field}`} /></label>
      <label className="text-[10px] font-bold text-muted">প্রদর্শন শেষের সময় (ঐচ্ছিক)<input name="endsAt" type="datetime-local" className={`mt-1 ${field}`} /></label>
      <label className="flex items-center gap-2 text-xs font-bold"><input name="publish" type="checkbox" className="accent-brand" /> এখনই প্রকাশ করুন</label>
      <button disabled={pending} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-xs font-bold text-white disabled:opacity-60">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />} সংরক্ষণ করুন</button>
    </div>
    {(state.error || state.success) && <p className={`mt-3 text-xs font-semibold ${state.error ? "text-red-700" : "text-emerald-700"}`}>{state.error ?? state.success}</p>}
  </form>;
}
