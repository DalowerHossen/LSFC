import type { Metadata } from "next";
import { Banknote, BookOpenCheck, History, ShieldCheck } from "lucide-react";
import { LicenseFeeForm, ServiceFeeForm } from "@/components/fees/FeeUpdateForms";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "ফি ব্যবস্থাপনা" };
const locations = { union_upazila: "ইউনিয়ন পর্যায়", upazila_sadar: "উপজেলা সদর", pourashava: "পৌরসভা", city_corporation_savar: "সিটি কর্পোরেশন/সাভার" } as const;
type Location = keyof typeof locations;
type Service = { code: string; name_bn: string; sort_order: number };
type ServiceFee = { service_code: string; location_type: Location; assistance_fee: number | string | null; extra_page_fee: number | string; effective_from: string };
type LicenseFee = { location_type: Location; fee: number | string; effective_from: string };
type Version = { id: string; service_code?: string; location_type: Location; assistance_fee?: number | string | null; extra_page_fee?: number | string; fee?: number | string; reason: string; created_at: string };
const money = new Intl.NumberFormat("bn-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 2 });

export default async function FeesPage() {
  await requireRole(["super_admin"]);
  const supabase = await createClient();
  const [{ data: services }, { data: serviceFees }, { data: licenseFees }, { data: serviceHistory }, { data: licenseHistory }] = await Promise.all([
    supabase.from("services").select("code, name_bn, sort_order").order("sort_order"),
    supabase.from("service_fees").select("service_code, location_type, assistance_fee, extra_page_fee, effective_from"),
    supabase.from("license_fees").select("location_type, fee, effective_from"),
    supabase.from("service_fee_versions").select("id, service_code, location_type, assistance_fee, extra_page_fee, reason, created_at").order("created_at", { ascending: false }).limit(8),
    supabase.from("license_fee_versions").select("id, location_type, fee, reason, created_at").order("created_at", { ascending: false }).limit(5),
  ]);
  const feeMap = new Map(((serviceFees ?? []) as ServiceFee[]).map((fee) => [`${fee.service_code}:${fee.location_type}`, fee]));

  return <div>
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2 text-xs font-bold text-brand"><Banknote className="size-4" /> কেন্দ্রীয় fee catalogue</div><h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">ফি ব্যবস্থাপনা</h1><p className="mt-2 text-sm text-muted">Appendix-6 লাইসেন্স ফি এবং Appendix-7 নাগরিক সহায়তা ফি।</p></div><div className="flex w-fit items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800"><ShieldCheck className="size-4" /> AAL2 ও audit-protected</div></div>

    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><BookOpenCheck className="size-5" /></div><div><h2 className="text-base font-extrabold">Appendix-6: কেন্দ্র লাইসেন্স ফি</h2><p className="mt-1 text-[10px] text-muted">লোকেশন শ্রেণিভিত্তিক বর্তমান ফি</p></div></div><div className="mt-5 grid gap-4 lg:grid-cols-3">{((licenseFees ?? []) as LicenseFee[]).map((item) => <article key={item.location_type} className="rounded-xl border border-border p-4"><p className="text-xs font-bold">{locations[item.location_type]}</p><p className="mt-2 text-xl font-extrabold text-brand">{money.format(Number(item.fee))}</p><p className="mt-1 text-[9px] text-muted">কার্যকর: {item.effective_from}</p><LicenseFeeForm locationType={item.location_type} fee={Number(item.fee)} /></article>)}</div></section>

    <section className="mt-6 rounded-2xl border border-border bg-white shadow-sm"><div className="border-b border-border p-5 sm:p-6"><h2 className="text-base font-extrabold">Appendix-7: সেবা সহায়তা ফি</h2><p className="mt-1 text-[10px] text-muted">সেবা খুলে তিনটি location category-এর ফি পরিবর্তন করুন</p></div><div className="divide-y divide-border">{((services ?? []) as Service[]).map((service) => <details key={service.code} className="group p-5 open:bg-brand-soft/10"><summary className="flex cursor-pointer list-none items-center justify-between gap-4"><div><span className="mr-2 text-[10px] font-bold text-brand">{String(service.sort_order).padStart(2, "0")}</span><span className="text-xs font-bold sm:text-sm">{service.name_bn}</span></div><span className="text-lg text-muted transition group-open:rotate-45">+</span></summary><div className="mt-5 grid gap-4 xl:grid-cols-3">{(Object.keys(locations) as Location[]).map((location) => { const fee = feeMap.get(`${service.code}:${location}`); return <div key={location}><p className="mb-2 text-[10px] font-bold text-muted">{locations[location]}</p>{fee ? <ServiceFeeForm serviceCode={service.code} locationType={location} assistanceFee={Number(fee.assistance_fee ?? 0)} extraPageFee={Number(fee.extra_page_fee)} /> : <p className="rounded-xl bg-red-50 p-4 text-xs text-red-700">ফি কনফিগার করা নেই</p>}</div>; })}</div></details>)}</div></section>

    <section className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-2"><History className="size-5 text-brand" /><h2 className="text-base font-extrabold">সাম্প্রতিক immutable history</h2></div><div className="mt-5 grid gap-3 lg:grid-cols-2">{[...((serviceHistory ?? []) as Version[]), ...((licenseHistory ?? []) as Version[])].sort((a,b) => Date.parse(b.created_at)-Date.parse(a.created_at)).slice(0,10).map((item) => <div key={item.id} className="rounded-xl border border-border p-4"><div className="flex justify-between gap-3"><p className="text-[10px] font-extrabold text-brand">{item.service_code ? "APPENDIX-7" : "APPENDIX-6"} • {locations[item.location_type]}</p><time className="text-[9px] text-muted">{new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" }).format(new Date(item.created_at))}</time></div><p className="mt-2 text-xs font-bold">{item.service_code ?? "কেন্দ্র license"}: {money.format(Number(item.assistance_fee ?? item.fee ?? 0))}</p><p className="mt-1 text-[10px] text-muted">{item.reason}</p></div>)}</div></section>
  </div>;
}
