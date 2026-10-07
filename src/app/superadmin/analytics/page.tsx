import type { Metadata } from "next";
import { BarChart3, MapPinned, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nationwide analytics" };

type DistrictRow = { district: string; center_count: number | string; active_center_count: number | string; application_count: number | string; completed_count: number | string; service_value: number | string };
type ServiceRow = { service_code: string; service_name: string; application_count: number | string; completed_count: number | string; service_value: number | string };
const number = new Intl.NumberFormat("bn-BD");
const money = new Intl.NumberFormat("bn-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 });

export default async function AnalyticsPage() {
  await requireRole(["super_admin"]);
  const supabase = await createClient();
  const [{ data: districtData }, { data: serviceData }] = await Promise.all([
    supabase.rpc("super_admin_district_analytics", { p_limit: 64 }),
    supabase.rpc("super_admin_service_analytics", { p_limit: 14 }),
  ]);
  const districts = ((districtData ?? []) as DistrictRow[]).map((row) => ({ district: row.district, centers: Number(row.center_count), activeCenters: Number(row.active_center_count), applications: Number(row.application_count), completed: Number(row.completed_count), value: Number(row.service_value) }));
  const services = ((serviceData ?? []) as ServiceRow[]).map((row) => ({ code: row.service_code, name: row.service_name, applications: Number(row.application_count), completed: Number(row.completed_count), value: Number(row.service_value) }));
  const maxService = Math.max(...services.map((item) => item.applications), 1);

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2 text-xs font-bold text-brand"><BarChart3 className="size-4" /> Non-PII aggregates</div><h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Nationwide analytics</h1><p className="mt-2 text-sm text-muted">জেলা, কেন্দ্র ও সেবাভিত্তিক সামগ্রিক কার্যক্রম।</p></div><span className="flex w-fit items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800"><ShieldCheck className="size-4" /> কোনো নাগরিক PII নেই</span></div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"><div className="border-b border-border p-5 sm:p-6"><div className="flex items-center gap-2"><MapPinned className="size-5 text-brand" /><h2 className="text-base font-extrabold">জেলাভিত্তিক কার্যক্রম</h2></div><p className="mt-1 text-[10px] text-muted">সর্বোচ্চ ৬৪ জেলা</p></div>{districts.length === 0 ? <Empty /> : <div className="max-h-[650px] overflow-auto"><table className="w-full min-w-[620px] text-left"><thead className="sticky top-0 bg-[#f7faf8] text-[10px] text-muted"><tr><th className="px-5 py-3">জেলা</th><th className="px-3 py-3">কেন্দ্র</th><th className="px-3 py-3">আবেদন</th><th className="px-3 py-3">সম্পন্ন</th><th className="px-5 py-3 text-right">সেবা মূল্য</th></tr></thead><tbody className="divide-y divide-border">{districts.map((item) => <tr key={item.district} className="text-xs"><td className="px-5 py-4 font-bold">{item.district}</td><td className="px-3 py-4">{number.format(item.activeCenters)}/{number.format(item.centers)}</td><td className="px-3 py-4 font-bold text-brand">{number.format(item.applications)}</td><td className="px-3 py-4">{number.format(item.completed)}</td><td className="px-5 py-4 text-right font-bold">{money.format(item.value)}</td></tr>)}</tbody></table></div>}</section>

        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6"><h2 className="text-base font-extrabold">সেবাভিত্তিক ব্যবহার</h2><p className="mt-1 text-[10px] text-muted">সব ১৪টি Appendix-7 সেবা</p>{services.length === 0 ? <Empty /> : <div className="mt-6 space-y-5">{services.map((service) => <div key={service.code}><div className="mb-2 flex items-end justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-bold">{service.name}</p><p className="mt-1 text-[9px] text-muted">{number.format(service.completed)}টি সম্পন্ন</p></div><div className="shrink-0 text-right"><p className="text-xs font-extrabold text-brand">{number.format(service.applications)}</p><p className="mt-1 text-[9px] text-muted">{money.format(service.value)}</p></div></div><div className="h-2 overflow-hidden rounded-full bg-brand-soft"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.max((service.applications / maxService) * 100, 2)}%` }} /></div></div>)}</div>}</section>
      </div>
    </div>
  );
}

function Empty() { return <div className="py-16 text-center text-xs text-muted">Analytics data এখনো পাওয়া যায়নি</div>; }
