"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, LoaderCircle, Mail } from "lucide-react";
import { requestPasswordResetAction, type ForgotPasswordState } from "@/app/(auth)/forgot-password/actions";

const initial: ForgotPasswordState = {};
export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initial);
  return <form action={action} className="mt-7 space-y-4">
    <label className="block text-sm font-bold" htmlFor="email">নিবন্ধিত ইমেইল</label>
    <div className="relative"><Mail className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" /><input id="email" name="email" type="email" required autoComplete="email" placeholder="name@example.com" className="h-13 w-full rounded-xl border border-border bg-white pr-4 pl-11 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/10" /></div>
    {(state.error || state.success) && <p role="status" className={`rounded-xl p-3 text-xs leading-6 ${state.error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{state.error ?? state.success}</p>}
    <button disabled={pending} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white disabled:opacity-60">{pending && <LoaderCircle className="size-4 animate-spin" />} নিরাপদ লিংক পাঠান</button>
    <Link href="/login" className="flex items-center justify-center gap-2 pt-2 text-xs font-bold text-brand"><ArrowLeft className="size-4 rotate-180" /> লগইনে ফিরে যান</Link>
  </form>;
}
