"use client";

import { useActionState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  LoaderCircle,
  MapPin,
  Save,
} from "lucide-react";
import {
  createCenterAction,
  type CenterActionState,
} from "@/app/superadmin/tenants/actions";

const initialState: CenterActionState = {};

export function CenterCreateForm() {
  const [state, formAction, pending] = useActionState(
    createCenterAction,
    initialState,
  );

  return (
    <form action={formAction} className="rounded-2xl border border-border bg-white shadow-sm">
      <div className="border-b border-border p-5 sm:p-6">
        <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><Building2 className="size-5" /></div><div><h2 className="text-base font-extrabold">কেন্দ্রের মৌলিক তথ্য</h2><p className="mt-1 text-[10px] text-muted">নতুন কেন্দ্র প্রথমে অপেক্ষমাণ থাকবে</p></div></div>
      </div>
      <div className="space-y-6 p-5 sm:p-6">
        {state.error && <Message error text={state.error} />}
        {state.success && <Message text={state.success} />}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="কেন্দ্র code" name="code" placeholder="LSFC-DHK-001" pattern="LSFC-[A-Za-z0-9-]{3,24}" />
          <Field label="কেন্দ্রের নাম" name="name" placeholder="ভূমিসেবা সহায়তা কেন্দ্র" />
          <div><label htmlFor="locationType" className="mb-2 block text-sm font-bold">লোকেশনের ধরন</label><select id="locationType" name="locationType" required className="h-13 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-brand"><option value="union_upazila">ইউনিয়ন পর্যায়</option><option value="upazila_sadar">উপজেলা সদর</option><option value="pourashava">পৌরসভা</option><option value="city_corporation_savar">সিটি কর্পোরেশন / সাভার</option></select></div>
          <Field label="বিভাগ" name="division" placeholder="ঢাকা" />
          <Field label="জেলা" name="district" placeholder="ঢাকা" />
          <Field label="উপজেলা" name="upazila" placeholder="উপজেলা" />
          <Field label="ইউনিয়ন / ওয়ার্ড" name="unionOrWard" placeholder="ঐচ্ছিক" required={false} />
          <Field label="মোবাইল নম্বর" name="phone" placeholder="01XXXXXXXXX" pattern="01[3-9][0-9]{8}" maxLength={11} />
          <Field label="ইমেইল" name="email" placeholder="center@example.com" type="email" required={false} />
          <Field label="লাইসেন্স নম্বর" name="licenseNumber" placeholder="ঐচ্ছিক" required={false} />
          <Field label="লাইসেন্সের মেয়াদ" name="licenseExpiresAt" placeholder="" type="date" required={false} />
        </div>

        <div><label htmlFor="address" className="mb-2 flex items-center gap-2 text-sm font-bold"><MapPin className="size-4 text-brand" /> পূর্ণ ঠিকানা</label><textarea id="address" name="address" required minLength={5} maxLength={500} rows={3} className="w-full resize-none rounded-xl border border-border p-4 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/10" /></div>

        <button type="submit" disabled={pending} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60">{pending ? <><LoaderCircle className="size-4 animate-spin" /> তৈরি হচ্ছে…</> : <><Save className="size-4" /> অপেক্ষমাণ কেন্দ্র তৈরি করুন</>}</button>
      </div>
    </form>
  );
}

function Field({ label, name, placeholder, required = true, ...props }: { label: string; name: string; placeholder: string; required?: boolean; type?: string; pattern?: string; maxLength?: number }) {
  return <div><label htmlFor={name} className="mb-2 block text-sm font-bold">{label}</label><input id={name} name={name} placeholder={placeholder} required={required} className="h-13 w-full rounded-xl border border-border px-4 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/10" {...props} /></div>;
}

function Message({ text, error = false }: { text: string; error?: boolean }) {
  return <div role={error ? "alert" : "status"} className={`flex gap-3 rounded-xl border p-4 text-xs ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error ? <AlertCircle className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0" />}{text}</div>;
}
