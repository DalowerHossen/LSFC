import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { CustomerReceipt } from "@/components/receipts/CustomerReceipt";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/types/application";
import type { ReceiptRecord } from "@/types/receipt";

export const metadata: Metadata = {
  title: "গ্রাহক রশিদ",
  description: "QR-যুক্ত অপরিবর্তনীয় গ্রাহক রশিদ প্রিন্ট করুন",
};

type ReceiptRow = {
  id: string;
  application_id: string;
  center_id: string;
  receipt_number: string;
  verification_token: string;
  version: number;
  signature_id: string | null;
  center_name: string;
  center_address: string;
  center_phone: string;
  service_name: string;
  citizen_name: string;
  citizen_mobile: string;
  government_fee: number | string;
  assistance_fee: number | string;
  additional_fee: number | string;
  total_fee: number | string;
  issued_at: string;
};

export default async function PrintReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["operator"]);
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: receiptData }, { data: applicationData }] = await Promise.all([
    supabase
      .from("receipts")
      .select("*")
      .eq("application_id", id)
      .order("version", { ascending: false })
      .limit(1)
      .single(),
    supabase.from("applications").select("status").eq("id", id).single(),
  ]);

  if (!receiptData || !applicationData || applicationData.status !== "completed") {
    notFound();
  }

  const row = receiptData as ReceiptRow;
  const [{ count: previousPrints }, { data: printSettings }, { data: logo }] = await Promise.all([
    supabase.from("receipt_print_events").select("id", { count: "exact", head: true }).eq("receipt_id", row.id),
    supabase.from("center_receipt_settings").select("default_format,header_text,footer_message,show_center_phone").eq("center_id", row.center_id).maybeSingle(),
    supabase.from("center_brand_assets").select("id").eq("center_id",row.center_id).eq("asset_type","logo").order("created_at",{ascending:false}).limit(1).maybeSingle(),
  ]);
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const protocol =
    headerStore.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? `${protocol}://${host}`).replace(/\/$/, "");
  const verificationUrl = `${siteUrl}/verify/${row.verification_token}`;

  const receipt: ReceiptRecord = {
    id: row.id,
    applicationId: row.application_id,
    receiptNumber: row.receipt_number,
    verificationToken: row.verification_token,
    version: row.version,
    signatureId: row.signature_id,
    centerName: row.center_name,
    centerAddress: row.center_address,
    centerPhone: row.center_phone,
    serviceName: row.service_name,
    citizenName: row.citizen_name,
    citizenMobile: row.citizen_mobile,
    governmentFee: Number(row.government_fee),
    assistanceFee: Number(row.assistance_fee),
    additionalFee: Number(row.additional_fee),
    totalFee: Number(row.total_fee),
    issuedAt: row.issued_at,
    applicationStatus: applicationData.status as ApplicationStatus,
  };

  return (
    <div>
      <div className="mb-7 print:hidden">
        <div className="flex items-center gap-2 text-xs font-bold text-brand"><Printer className="size-4" /> গ্রাহক কপি</div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">রশিদ প্রিন্ট</h1>
        <p className="mt-2 text-sm leading-7 text-muted">প্রিন্টারের কাগজের মাপ নির্বাচন করে শুধু গ্রাহক কপি প্রিন্ট করুন।</p>
      </div>
      <CustomerReceipt receipt={receipt} verificationUrl={verificationUrl} previousPrints={previousPrints ?? 0} settings={{ defaultFormat: (printSettings?.default_format as "58mm" | "80mm" | "a4-half" | undefined) ?? "80mm", headerText: printSettings?.header_text ?? null, footerMessage: printSettings?.footer_message ?? null, showCenterPhone: printSettings?.show_center_phone ?? true,logoId:logo?.id??null }} />
    </div>
  );
}
