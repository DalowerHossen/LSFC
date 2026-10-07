"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationFormState } from "@/types/application";

const applicationSchema = z.object({
  clientRequestId: z.uuid(),
  serviceCode: z.string().min(2).max(80),
  citizenName: z.string().trim().min(2, "নাগরিকের পূর্ণ নাম লিখুন").max(120),
  citizenMobile: z.string().regex(/^01[3-9][0-9]{8}$/, "সঠিক বাংলাদেশি মোবাইল নম্বর লিখুন"),
  governmentFee: z.coerce.number().min(0).max(1_000_000),
  scanPageCount: z.coerce.number().int().min(0).max(500),
  consentReceived: z.literal("on", {
    error: "নাগরিকের সম্মতি নিশ্চিত করা আবশ্যক",
  }),
});

type RpcApplicationRow = {
  application_id: string;
  tracking_id: string;
  receipt_number: string;
  total_fee: number | string;
};

export async function createApplicationAction(
  _previousState: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  await requireRole(["operator"]);

  const parsed = applicationSchema.safeParse({
    clientRequestId: formData.get("clientRequestId"),
    serviceCode: formData.get("serviceCode"),
    citizenName: formData.get("citizenName"),
    citizenMobile: formData.get("citizenMobile"),
    governmentFee: formData.get("governmentFee") || 0,
    scanPageCount: formData.get("scanPageCount") || 0,
    consentReceived: formData.get("consentReceived"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "আবেদনের তথ্য যাচাই করুন",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_application", {
    p_client_request_id: parsed.data.clientRequestId,
    p_service_code: parsed.data.serviceCode,
    p_citizen_name: parsed.data.citizenName,
    p_citizen_mobile: parsed.data.citizenMobile,
    p_government_fee: parsed.data.governmentFee,
    p_scan_page_count: parsed.data.scanPageCount,
    p_consent_received: true,
  });

  const row = (Array.isArray(data) ? data[0] : data) as RpcApplicationRow | null;

  if (error || !row) {
    return {
      error: "আবেদনটি সংরক্ষণ করা যায়নি। কেন্দ্রের অবস্থা ও সেবা ফি যাচাই করে আবার চেষ্টা করুন।",
    };
  }

  return {
    application: {
      applicationId: row.application_id,
      trackingId: row.tracking_id,
      receiptNumber: row.receipt_number,
      totalFee: Number(row.total_fee),
    },
  };
}
