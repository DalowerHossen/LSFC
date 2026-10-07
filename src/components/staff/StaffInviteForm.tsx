"use client";

import { useActionState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  IdCard,
  LoaderCircle,
  Mail,
  Phone,
  Send,
  UserRound,
} from "lucide-react";
import {
  inviteStaffAction,
  type StaffActionState,
} from "@/app/owner/staff/actions";

const initialState: StaffActionState = {};

export function StaffInviteForm({ configured }: { configured: boolean }) {
  const [state, formAction, pending] = useActionState(
    inviteStaffAction,
    initialState,
  );

  return (
    <form action={formAction} className="rounded-2xl border border-border bg-white shadow-sm">
      <div className="border-b border-border p-5 sm:p-6">
        <h2 className="text-base font-extrabold">কর্মচারীর তথ্য</h2>
        <p className="mt-1 text-[11px] text-muted">কর্মচারী ইমেইলে নিরাপদ অ্যাকাউন্ট সক্রিয়করণ লিংক পাবেন</p>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {!configured && <Message error text="ডেটাবেজ Admin ও site URL কনফিগার করার পর invitation সক্রিয় হবে।" />}
        {state.error && <Message error text={state.error} />}
        {state.success && <Message text={state.success} />}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="পূর্ণ নাম" name="fullName" placeholder="কর্মচারীর পূর্ণ নাম" icon={UserRound} />
          <Field label="পদবি" name="designation" placeholder="কম্পিউটার অপারেটর" icon={IdCard} defaultValue="কম্পিউটার অপারেটর" />
          <Field label="ইমেইল" name="email" placeholder="staff@example.com" icon={Mail} type="email" />
          <Field label="মোবাইল নম্বর" name="phone" placeholder="01XXXXXXXXX" icon={Phone} inputMode="numeric" pattern="01[3-9][0-9]{8}" maxLength={11} />
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-[11px] leading-6 text-blue-900">
          সরাসরি password তৈরি করা হবে না। কর্মচারী invitation লিংক ব্যবহার করে নিজের password সেট করবেন।
        </div>

        <button type="submit" disabled={pending || !configured} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-lg shadow-brand/15 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60">
          {pending ? <><LoaderCircle className="size-4 animate-spin" /> আমন্ত্রণ পাঠানো হচ্ছে…</> : <><Send className="size-4" /> কর্মচারীকে আমন্ত্রণ জানান</>}
        </button>
      </div>
    </form>
  );
}

function Field({ label, icon: Icon, ...props }: { label: string; icon: typeof UserRound; name: string; placeholder: string; type?: string; defaultValue?: string; inputMode?: "numeric"; pattern?: string; maxLength?: number }) {
  return (
    <div>
      <label htmlFor={props.name} className="mb-2 block text-sm font-bold">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
        <input id={props.name} required className="h-13 w-full rounded-xl border border-border bg-white pr-4 pl-11 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/10" {...props} />
      </div>
    </div>
  );
}

function Message({ text, error = false }: { text: string; error?: boolean }) {
  return <div role={error ? "alert" : "status"} className={`flex gap-3 rounded-xl border p-4 text-xs leading-5 ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error ? <AlertCircle className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0" />}{text}</div>;
}
