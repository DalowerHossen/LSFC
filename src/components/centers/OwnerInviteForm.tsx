"use client";

import { useActionState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Mail,
  Phone,
  Send,
  UserRound,
} from "lucide-react";
import {
  inviteCenterOwnerAction,
  type OwnerInviteState,
} from "@/app/superadmin/tenants/owner-actions";

const initialState: OwnerInviteState = {};

export function OwnerInviteForm({
  centerId,
  configured,
}: {
  centerId: string;
  configured: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    inviteCenterOwnerAction,
    initialState,
  );

  return (
    <form action={formAction} className="rounded-2xl border border-border bg-white shadow-sm">
      <input type="hidden" name="centerId" value={centerId} />
      <div className="border-b border-border p-5 sm:p-6"><h2 className="text-base font-extrabold">কেন্দ্র পরিচালককে আমন্ত্রণ</h2><p className="mt-1 text-[10px] text-muted">অ্যাকাউন্ট সর্বদা কেন্দ্র পরিচালক ভূমিকা ও নির্দিষ্ট কেন্দ্র দিয়ে যুক্ত হবে</p></div>
      <div className="space-y-5 p-5 sm:p-6">
        {!configured && <Message error text="ডেটাবেজ Admin ও public site URL কনফিগার করার পর invitation সক্রিয় হবে।" />}
        {state.error && <Message error text={state.error} />}
        {state.success && <Message text={state.success} />}
        <Field icon={UserRound} label="কেন্দ্র পরিচালক-এর পূর্ণ নাম" name="fullName" placeholder="পূর্ণ নাম" />
        <Field icon={Mail} label="ইমেইল" name="email" placeholder="owner@example.com" type="email" />
        <Field icon={Phone} label="মোবাইল নম্বর" name="phone" placeholder="01XXXXXXXXX" pattern="01[3-9][0-9]{8}" maxLength={11} />
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-[11px] leading-6 text-amber-900">কেন্দ্র পরিচালককে আমন্ত্রণ লিংক থেকে পাসওয়ার্ড তৈরি করবেন এবং বাধ্যতামূলক টিওটিপি সেটআপ শেষ করবেন। কেন্দ্র সক্রিয় না হওয়া পর্যন্ত কার্যক্রম ড্যাশবোর্ড বন্ধ থাকবে।</div>
        <button type="submit" disabled={pending || !configured} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60">{pending ? <><LoaderCircle className="size-4 animate-spin" /> পাঠানো হচ্ছে…</> : <><Send className="size-4" /> পরিচালককে আমন্ত্রণ পাঠান</>}</button>
      </div>
    </form>
  );
}

function Field({ icon: Icon, label, name, placeholder, ...props }: { icon: typeof UserRound; label: string; name: string; placeholder: string; type?: string; pattern?: string; maxLength?: number }) {
  return <div><label htmlFor={name} className="mb-2 block text-sm font-bold">{label}</label><div className="relative"><Icon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" /><input id={name} name={name} placeholder={placeholder} required className="h-13 w-full rounded-xl border border-border pr-4 pl-11 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/10" {...props} /></div></div>;
}

function Message({ text, error = false }: { text: string; error?: boolean }) {
  return <div className={`flex gap-3 rounded-xl border p-4 text-xs ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error ? <AlertCircle className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0" />}{text}</div>;
}
