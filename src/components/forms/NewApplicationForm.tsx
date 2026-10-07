"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  FileCheck2,
  FileText,
  LoaderCircle,
  Phone,
  ReceiptText,
  RefreshCw,
  ScanLine,
  Trash2,
  UserRound,
  WifiOff,
} from "lucide-react";
import { createApplicationAction } from "@/app/operator/new-application/actions";
import { discardOfflineApplication,offlineQueueItems,queueOfflineApplication,retryOfflineApplication,syncOfflineApplications,type OfflineQueueItem } from "@/lib/offline/encrypted-application-queue";
import type { ApplicationFormState, ServiceOption } from "@/types/application";

const initialState: ApplicationFormState = {};
const money = new Intl.NumberFormat("bn-BD", {
  style: "currency",
  currency: "BDT",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function NewApplicationForm({
  services,
  requestId,
}: {
  services: ServiceOption[];
  requestId: string;
}) {
  const [state, formAction, pending] = useActionState(createApplicationAction, initialState);
  const [serviceCode, setServiceCode] = useState(services[0]?.code ?? "");
  const [governmentFee, setGovernmentFee] = useState("0");
  const [scanPages, setScanPages] = useState("0");
  const [clientRequestId, setClientRequestId] = useState(requestId);
  const [offlineItems, setOfflineItems] = useState<OfflineQueueItem[]>([]);
  const [offlineMessage, setOfflineMessage] = useState<string>();
  const refreshOfflineItems = useCallback(async () => { setOfflineItems(await offlineQueueItems()); }, []);
  const syncOfflineQueue = useCallback(async () => {
    const summary = await syncOfflineApplications(async (form) => {
      const result = await createApplicationAction(initialState, form);
      return result.application ? { success: true } : { success: false, errorCode: "SERVER_REJECTED" as const };
    });
    if (summary.synced || summary.failed) setOfflineMessage(`${summary.synced}টি আবেদন সিঙ্ক হয়েছে${summary.failed ? `; ${summary.failed}টি পর্যালোচনা প্রয়োজন।` : "।"}`);
    await refreshOfflineItems();
  }, [refreshOfflineItems]);
  useEffect(() => {
    let active = true;
    const refresh = () => offlineQueueItems().then((items) => { if (active) setOfflineItems(items); }).catch(() => {});
    const sync = () => syncOfflineQueue().catch(() => { if (active) setOfflineMessage("অফলাইন সারি সিঙ্ক করা যায়নি। আবার চেষ্টা করুন।"); });
    refresh(); sync(); window.addEventListener("online", sync);
    return () => { active = false; window.removeEventListener("online", sync); };
  }, [syncOfflineQueue]);
  async function handleSubmit(event:FormEvent<HTMLFormElement>){if(navigator.onLine)return;event.preventDefault();const form=event.currentTarget;try{await queueOfflineApplication(new FormData(form));await refreshOfflineItems();setOfflineMessage("ইন্টারনেট না থাকায় আবেদনটি এই ডিভাইসে এনক্রিপ্ট করে রাখা হয়েছে। সংযোগ ফিরলে স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।");form.reset();setServiceCode(services[0]?.code??"");setGovernmentFee("0");setScanPages("0");setClientRequestId(crypto.randomUUID())}catch{setOfflineMessage("অফলাইন আবেদন নিরাপদে সংরক্ষণ করা যায়নি।")}}
  async function retryOfflineItem(id:string){try{await retryOfflineApplication(id);setOfflineMessage("আবেদনটি পুনঃপ্রচেষ্টার জন্য প্রস্তুত।");await syncOfflineQueue()}catch{setOfflineMessage("পুনঃপ্রচেষ্টা শুরু করা যায়নি।")}}
  async function discardOfflineItem(id:string){if(!window.confirm("এই ডিভাইসের এনক্রিপ্টেড খসড়াটি স্থায়ীভাবে সরাবেন? সার্ভারে সংরক্ষিত কোনো আবেদন এতে মুছবে না।"))return;try{await discardOfflineApplication(id);setOfflineMessage("স্থানীয় অফলাইন খসড়াটি সরানো হয়েছে।");await refreshOfflineItems()}catch{setOfflineMessage("খসড়াটি সরানো যায়নি।")}}

  const selectedService = useMemo(
    () => services.find((service) => service.code === serviceCode),
    [serviceCode, services],
  );

  const extraFee =
    serviceCode === "e-mutation-application"
      ? Math.max(Number(scanPages || 0) - 20, 0) *
        (selectedService?.extraPageFee ?? 0)
      : 0;
  const totalFee =
    Number(governmentFee || 0) +
    (selectedService?.assistanceFee ?? 0) +
    extraFee;

  if (state.application) {
    return (
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
        <div className="bg-emerald-50 px-6 py-7 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-200">
            <CheckCircle2 className="size-7" />
          </div>
          <h2 className="mt-4 text-xl font-extrabold text-emerald-950">আবেদন সফলভাবে গ্রহণ করা হয়েছে</h2>
          <p className="mt-2 text-xs text-emerald-800/70">একই অনুরোধ আবার পাঠালেও অনুলিপি আবেদন তৈরি হবে না।</p>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <Result label="ট্র্যাকিং আইডি" value={state.application.trackingId} />
          <Result label="রশিদ নম্বর" value={state.application.receiptNumber} />
          <div className="sm:col-span-2 rounded-xl border border-border bg-[#f7faf8] p-4 text-center">
            <p className="text-xs font-semibold text-muted">মোট আদায়যোগ্য</p>
            <p className="mt-1 text-2xl font-extrabold text-brand">{money.format(state.application.totalFee)}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-border p-5 sm:flex-row">
          <button type="button" onClick={() => window.location.reload()} className="flex h-11 flex-1 items-center justify-center rounded-xl bg-brand px-4 text-sm font-bold text-white">
            আরেকটি আবেদন নিন
          </button>
          <Link href={`/operator/consent-form/${state.application.applicationId}`} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border text-sm font-bold text-brand hover:bg-brand-soft">
            <ReceiptText className="size-4" /> সম্মতিপত্র প্রিন্ট করুন
          </Link>
          <Link href={`/operator/applications/${state.application.applicationId}/documents`} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border text-sm font-bold text-brand hover:bg-brand-soft">
            <FileText className="size-4" /> নথি যোগ করুন
          </Link>
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-900">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-1 size-5 shrink-0" />
          <p>এই কেন্দ্রের জন্য কোনো সক্রিয় সেবা ফি পাওয়া যায়নি। সুপার অ্যাডমিনের ফি কনফিগারেশন যাচাই করুন।</p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <input type="hidden" name="clientRequestId" value={clientRequestId} />

      <div className="space-y-6">
        {(offlineMessage||offlineItems.length>0)&&<div role="status" aria-live="polite" className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900"><WifiOff className="mt-0.5 size-5 shrink-0" aria-hidden="true"/><span>{offlineMessage??`${offlineItems.length}টি এনক্রিপ্টেড আবেদন এই ডিভাইসে আছে।`}</span></div>}
        {offlineItems.length>0&&<section aria-labelledby="offline-queue-title" className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="offline-queue-title" className="text-sm font-extrabold">এই ডিভাইসের অফলাইন সারি</h2><p className="mt-1 text-[10px] leading-5 text-muted">নাগরিকের তথ্য এখানে দেখানো হয় না। ব্যর্থ item পর্যালোচনা করে পুনঃপ্রচেষ্টা বা স্থানীয় খসড়া অপসারণ করুন।</p></div><button type="button" onClick={()=>syncOfflineQueue().catch(()=>setOfflineMessage("সিঙ্ক করা যায়নি।"))} className="flex h-9 items-center gap-2 rounded-lg border border-brand px-3 text-[10px] font-bold text-brand"><RefreshCw className="size-3.5" aria-hidden="true"/>এখন সিঙ্ক করুন</button></div>
          <ul className="mt-4 space-y-2">{offlineItems.map((item)=><li key={item.id} className="flex flex-col justify-between gap-3 rounded-xl bg-[#f7faf8] p-3 sm:flex-row sm:items-center"><div><p className="font-mono text-[10px] font-bold">{item.id.slice(0,8)}…</p><p className="mt-1 text-[9px] text-muted">{new Intl.DateTimeFormat("bn-BD",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Dhaka"}).format(new Date(item.createdAt))} • প্রচেষ্টা {item.attemptCount}</p>{item.lastErrorCode&&<p className="mt-1 text-[9px] font-bold text-red-700">অবস্থা: {offlineErrorLabel(item.lastErrorCode)}</p>}</div><div className="flex gap-2">{item.status==="failed"&&item.lastErrorCode!=="DEVICE_MISMATCH"&&<button type="button" onClick={()=>retryOfflineItem(item.id)} className="flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-[9px] font-bold text-white"><RefreshCw className="size-3" aria-hidden="true"/>পুনঃপ্রচেষ্টা</button>}<button type="button" onClick={()=>discardOfflineItem(item.id)} className="flex h-8 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-[9px] font-bold text-red-700"><Trash2 className="size-3" aria-hidden="true"/>খসড়া সরান</button></div></li>)}</ul>
        </section>}
        {state.error && (
          <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            <AlertCircle className="mt-0.5 size-5 shrink-0" /> {state.error}
          </div>
        )}

        <section className="rounded-2xl border border-border bg-white shadow-sm shadow-slate-200/30">
          <SectionHeader number="১" title="সেবা নির্বাচন" description="নাগরিক যে সেবাটি গ্রহণ করতে চান" icon={FileText} />
          <div className="p-5 sm:p-6">
            <label htmlFor="serviceকোড" className="mb-2 block text-sm font-bold">ভূমিসেবার ধরন</label>
            <select
              id="serviceকোড"
              name="serviceCode"
              value={serviceCode}
              onChange={(event) => setServiceCode(event.target.value)}
              required
              className="h-13 w-full rounded-xl border border-border bg-white px-4 text-sm font-semibold outline-none focus:border-brand focus:ring-3 focus:ring-brand/10"
            >
              {services.map((service) => (
                <option key={service.code} value={service.code}>{service.name}</option>
              ))}
            </select>

            {serviceCode === "e-mutation-application" && (
              <div className="mt-5">
                <label htmlFor="scanPageCount" className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <ScanLine className="size-4 text-brand" /> মোট স্ক্যান পৃষ্ঠা
                </label>
                <input
                  id="scanPageCount"
                  name="scanPageCount"
                  type="number"
                  min="0"
                  max="500"
                  value={scanPages}
                  onChange={(event) => setScanPages(event.target.value)}
                  className="h-13 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/10"
                />
                <p className="mt-2 text-[11px] leading-5 text-muted">২০ পৃষ্ঠার বেশি হলে প্রতি অতিরিক্ত পৃষ্ঠায় {money.format(selectedService?.extraPageFee ?? 0)} যোগ হবে।</p>
              </div>
            )}
            {serviceCode !== "e-mutation-application" && <input type="hidden" name="scanPageCount" value="0" />}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white shadow-sm shadow-slate-200/30">
          <SectionHeader number="২" title="নাগরিকের তথ্য" description="সঠিক নাম ও সচল মোবাইল নম্বর দিন" icon={UserRound} />
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <label htmlFor="citizenName" className="mb-2 block text-sm font-bold">নাগরিকের পূর্ণ নাম</label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
                <input id="citizenName" name="citizenName" required minLength={2} maxLength={120} autoComplete="name" placeholder="পূর্ণ নাম লিখুন" className="h-13 w-full rounded-xl border border-border bg-white pr-4 pl-11 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/10" />
              </div>
            </div>
            <div>
              <label htmlFor="citizenMobile" className="mb-2 block text-sm font-bold">মোবাইল নম্বর</label>
              <div className="relative">
                <Phone className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
                <input id="citizenMobile" name="citizenMobile" required inputMode="numeric" pattern="01[3-9][0-9]{8}" maxLength={11} placeholder="01XXXXXXXXX" className="h-13 w-full rounded-xl border border-border bg-white pr-4 pl-11 font-mono text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/10" />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white shadow-sm shadow-slate-200/30">
          <SectionHeader number="৩" title="ফি ও সম্মতি" description="সরকারি পোর্টালের প্রকৃত ফি এবং নাগরিকের সম্মতি" icon={Banknote} />
          <div className="p-5 sm:p-6">
            <label htmlFor="governmentFee" className="mb-2 block text-sm font-bold">সরকারি ফি</label>
            <div className="relative max-w-sm">
              <span className="absolute top-1/2 left-4 -translate-y-1/2 text-sm font-extrabold text-brand">৳</span>
              <input id="governmentFee" name="governmentFee" type="number" min="0" max="1000000" step="0.01" value={governmentFee} onChange={(event) => setGovernmentFee(event.target.value)} className="h-13 w-full rounded-xl border border-border bg-white pr-4 pl-10 text-sm font-bold outline-none focus:border-brand focus:ring-3 focus:ring-brand/10" />
            </div>
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-brand/15 bg-brand-soft/50 p-4">
              <input type="checkbox" name="consentReceived" required className="mt-1 size-4 accent-brand" />
              <span>
                <span className="block text-sm font-bold text-foreground">নাগরিকের সম্মতি গ্রহণ করেছি</span>
                <span className="mt-1 block text-[11px] leading-5 text-muted">প্রদত্ত তথ্য ব্যবহার ও প্রতিনিধি হিসেবে অনলাইন আবেদন করার সম্মতি নাগরিক দিয়েছেন।</span>
              </span>
            </label>
          </div>
        </section>
      </div>

      <aside className="xl:sticky xl:top-[108px] xl:self-start">
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm shadow-slate-200/30">
          <div className="bg-[#0d4637] p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-white/10"><ReceiptText className="size-5" /></div>
              <div><h2 className="text-sm font-extrabold">ফি সারাংশ</h2><p className="mt-1 text-[10px] text-white/55">লোকেশনভিত্তিক স্বয়ংক্রিয় হিসাব</p></div>
            </div>
          </div>
          <div className="space-y-4 p-5 text-sm">
            <FeeRow label="সরকারি ফি" value={Number(governmentFee || 0)} />
            <FeeRow label="সহায়তা ফি" value={selectedService?.assistanceFee ?? 0} />
            <FeeRow label="অতিরিক্ত পৃষ্ঠা" value={extraFee} />
            <div className="border-t border-dashed border-border pt-4">
              <div className="flex items-end justify-between gap-4">
                <span className="font-bold">মোট আদায়যোগ্য</span>
                <span className="text-2xl font-extrabold text-brand">{money.format(totalFee)}</span>
              </div>
            </div>
          </div>
          <div className="border-t border-border bg-[#f7faf8] p-5">
            <div className="mb-4 flex items-start gap-2 text-[10px] leading-5 text-muted">
              <BadgeCheck className="mt-0.5 size-4 shrink-0 text-brand" /> সহায়তা ফি database থেকে server-side পুনরায় হিসাব হবে।
            </div>
            <button type="submit" disabled={pending || !requestId} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white shadow-lg shadow-brand/15 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60">
              {pending ? <><LoaderCircle className="size-4 animate-spin" /> সংরক্ষণ হচ্ছে…</> : <><FileCheck2 className="size-4" /> আবেদন গ্রহণ করুন <ArrowLeft className="size-4" /></>}
            </button>
          </div>
        </div>
      </aside>
    </form>
  );
}

function SectionHeader({ number, title, description, icon: Icon }: { number: string; title: string; description: string; icon: typeof FileText }) {
  return (
    <div className="flex items-center gap-4 border-b border-border px-5 py-4 sm:px-6">
      <div className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="size-5" /><span className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-brand text-[8px] font-bold text-white">{number}</span></div>
      <div><h2 className="text-sm font-extrabold">{title}</h2><p className="mt-1 text-[10px] text-muted">{description}</p></div>
    </div>
  );
}

function FeeRow({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-xs text-muted">{label}</span><span className="font-bold">{money.format(value)}</span></div>;
}

function Result({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 break-all font-mono text-sm font-extrabold text-foreground">{value}</p></div>;
}

function offlineErrorLabel(code: NonNullable<OfflineQueueItem["lastErrorCode"]>) {
  return { SERVER_REJECTED: "সার্ভার আবেদনটি গ্রহণ করেনি", DECRYPTION_FAILED: "স্থানীয় তথ্য ডিক্রিপ্ট করা যায়নি", DEVICE_MISMATCH: "ডিভাইস পরিচয় মেলেনি" }[code];
}
