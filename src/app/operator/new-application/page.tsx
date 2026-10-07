import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { FilePlus2, ShieldCheck } from "lucide-react";
import { NewApplicationForm } from "@/components/forms/NewApplicationForm";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ServiceOption } from "@/types/application";

export const metadata: Metadata = {
  title: "নতুন আবেদন",
  description: "নাগরিকের নতুন ভূমিসেবা আবেদন গ্রহণ করুন",
};

type ServiceRow = {
  code: string;
  name_bn: string;
  sort_order: number;
};

type FeeRow = {
  service_code: string;
  assistance_fee: number | string | null;
  extra_page_fee: number | string;
};

export default async function NewApplicationPage() {
  const context = await requireRole(["operator"]);
  const supabase = await createClient();

  const { data: center } = await supabase
    .from("centers")
    .select("location_type")
    .eq("id", context.centerId!)
    .single();

  let services: ServiceOption[] = [];

  if (center?.location_type) {
    const [{ data: serviceRows }, { data: feeRows }] = await Promise.all([
      supabase
        .from("services")
        .select("code, name_bn, sort_order")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("service_fees")
        .select("service_code, assistance_fee, extra_page_fee")
        .eq("location_type", center.location_type),
    ]);

    const feesByService = new Map(
      ((feeRows ?? []) as FeeRow[]).map((fee) => [fee.service_code, fee]),
    );

    services = ((serviceRows ?? []) as ServiceRow[]).flatMap((service) => {
      const fee = feesByService.get(service.code);
      if (!fee || fee.assistance_fee === null) return [];

      return [
        {
          code: service.code,
          name: service.name_bn,
          assistanceFee: Number(fee.assistance_fee),
          extraPageFee: Number(fee.extra_page_fee),
        },
      ];
    });
  }

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand">
            <FilePlus2 className="size-4" /> আবেদন গ্রহণ
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">নতুন ভূমিসেবা আবেদন</h1>
          <p className="mt-2 text-sm leading-7 text-muted">সেবা নির্বাচন করুন, নাগরিকের তথ্য নিন এবং স্বয়ংক্রিয়ভাবে নির্ধারিত ফি যাচাই করুন।</p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800">
          <ShieldCheck className="size-4" /> নিরাপদ ও নিরীক্ষাযোগ্য
        </div>
      </div>

      <NewApplicationForm services={services} requestId={randomUUID()} />
    </div>
  );
}
