import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, CircleAlert } from "lucide-react";
import { PublicHeader } from "@/components/common/PublicHeader";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "সরকার অনুমোদিত সেবা ও ফি",
  description: "ভূমিসেবা সহায়তা কেন্দ্রের সেবা এবং সরকার নির্ধারিত সহায়তা ফি",
};
export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("bn-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

type Fee = { location_type: string; assistance_fee: number | string | null; extra_page_fee: number | string };
type Service = { code: string; name_bn: string; description_bn: string | null; sort_order: number; service_fees: Fee[] };
const tiers = [
  ["union_upazila", "ইউনিয়ন"],
  ["upazila_sadar", "উপজেলা সদর"],
  ["pourashava", "পৌরসভা"],
  ["city_corporation_savar", "সিটি কর্পোরেশন ও সাভার"],
] as const;

function feeText(fee: Fee | undefined) {
  if (!fee || fee.assistance_fee === null) return "সরকার নির্ধারিত";
  const base = money.format(Number(fee.assistance_fee));
  return Number(fee.extra_page_fee) > 0 ? `${base} + অতিরিক্ত পৃষ্ঠা ${money.format(Number(fee.extra_page_fee))}` : base;
}

export default async function ServicesPage() {
  let services: Service[] = [];
  let unavailable = !hasSupabasePublicEnv();
  if (!unavailable) {
    const { data, error } = await (await createClient())
      .from("services")
      .select("code,name_bn,description_bn,sort_order,service_fees(location_type,assistance_fee,extra_page_fee)")
      .eq("is_active", true)
      .is("service_fees.valid_to", null)
      .order("sort_order");
    unavailable = Boolean(error);
    services = (data ?? []) as Service[];
  }

  return (
    <>
      <PublicHeader />
      <main className="min-h-[calc(100vh-72px)] bg-[#f3f7f5] px-5 py-12">
        <section className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-2 text-xs font-bold text-brand"><BadgeCheck className="size-4" /> পরিশিষ্ট–৭</div>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">সরকার অনুমোদিত সেবা ও সহায়তা ফি</h1>
            <p className="mt-4 text-sm leading-7 text-muted">কেন্দ্রের অবস্থান অনুযায়ী প্রযোজ্য সর্বশেষ সক্রিয় ফি নিচে দেখানো হয়েছে। সরকারি পোর্টালের মূল ফি আলাদা হলে রশিদে পৃথকভাবে উল্লেখ থাকবে।</p>
          </div>

          {unavailable ? (
            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900"><CircleAlert className="mt-1 size-5 shrink-0" /> ফি তালিকা এখন প্রদর্শন করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।</div>
          ) : (
            <div className="mt-9 space-y-4">
              {services.map((service, index) => (
                <article key={service.code} className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                  <div className="border-b border-border p-5 sm:p-6"><p className="text-[10px] font-extrabold text-brand">সেবা {new Intl.NumberFormat("bn-BD").format(index + 1)}</p><h2 className="mt-1 text-base font-extrabold">{service.name_bn}</h2>{service.description_bn && <p className="mt-2 text-xs leading-6 text-muted">{service.description_bn}</p>}</div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4">
                    {tiers.map(([code, label]) => <div key={code} className="border-t border-border p-4 sm:border-r"><p className="text-[10px] font-bold text-muted">{label}</p><p className="mt-1 text-sm font-extrabold text-brand">{feeText(service.service_fees.find((fee) => fee.location_type === code))}</p></div>)}
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-xs leading-6 text-blue-900">দ্বিতীয় ও পরবর্তী গ্রাহক কপি পুনর্মুদ্রণের ফি প্রতি কপি {money.format(20)}। কোনো অসামঞ্জস্য দেখলে রশিদ গ্রহণের আগে Center পরিচালকের সঙ্গে কথা বলুন।</div>
          <Link href="/" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-brand"><ArrowLeft className="size-4 rotate-180" /> হোমে ফিরুন</Link>
        </section>
      </main>
    </>
  );
}
