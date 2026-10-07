"use client";

import { useActionState } from "react";
import { AlertCircle, ArrowLeft, KeyRound, LoaderCircle, LockKeyhole } from "lucide-react";
import { setPasswordAction, type PasswordState } from "@/app/(auth)/set-password/actions";

const initialState: PasswordState = {};

export function SetPasswordForm() {
  const [state, formAction, pending] = useActionState(setPasswordAction, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {state.error && <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800"><AlertCircle className="size-4 shrink-0" />{state.error}</div>}
      <PasswordField name="password" label="নতুন পাসওয়ার্ড" placeholder="কমপক্ষে ১০ অক্ষর" />
      <PasswordField name="confirmPassword" label="পাসওয়ার্ড নিশ্চিত করুন" placeholder="একই পাসওয়ার্ড আবার লিখুন" />
      <div className="flex items-start gap-3 rounded-xl bg-brand-soft/60 p-4 text-[11px] leading-6 text-muted"><KeyRound className="mt-0.5 size-4 shrink-0 text-brand" /> বড় ও ছোট অক্ষর, সংখ্যা এবং বিশেষ চিহ্ন মিলিয়ে শক্তিশালী পাসওয়ার্ড ব্যবহার করুন।</div>
      <button type="submit" disabled={pending} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60">
        {pending ? <><LoaderCircle className="size-4 animate-spin" /> সংরক্ষণ হচ্ছে…</> : <>পাসওয়ার্ড সেট করুন <ArrowLeft className="size-4" /></>}
      </button>
    </form>
  );
}

function PasswordField({ name, label, placeholder }: { name: string; label: string; placeholder: string }) {
  return <div><label htmlFor={name} className="mb-2 block text-sm font-bold">{label}</label><div className="relative"><LockKeyhole className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" /><input id={name} name={name} type="password" minLength={10} maxLength={128} required autoComplete="new-password" placeholder={placeholder} className="h-13 w-full rounded-xl border border-border pr-4 pl-11 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/10" /></div></div>;
}
