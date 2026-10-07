"use server";

import { z } from "zod";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/types/application";
import type { TrackingState } from "@/types/tracking";

const trackingSchema = z.object({
  trackingId: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^LS-[A-F0-9]{12}$/, "সঠিক Tracking ID লিখুন"),
  mobile: z
    .string()
    .trim()
    .regex(/^01[3-9][0-9]{8}$/, "সঠিক বাংলাদেশি মোবাইল নম্বর লিখুন"),
});

type TrackingRow = {
  tracking_id: string;
  receipt_number: string | null;
  center_name: string;
  service_name: string;
  application_status: ApplicationStatus;
  total_fee: number | string;
  submitted_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

export async function trackApplicationAction(
  _previousState: TrackingState,
  formData: FormData,
): Promise<TrackingState> {
  const parsed = trackingSchema.safeParse({
    trackingId: formData.get("trackingId"),
    mobile: formData.get("mobile"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "তথ্য যাচাই করুন" };
  }

  if (!hasSupabasePublicEnv()) {
    return { error: "Tracking service এখনো live database-এর সঙ্গে সংযুক্ত হয়নি।" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("track_application", {
    p_tracking_id: parsed.data.trackingId,
    p_citizen_mobile: parsed.data.mobile,
  });
  const row = (Array.isArray(data) ? data[0] : data) as TrackingRow | null;

  if (error || !row) {
    return {
      error: "Tracking ID ও মোবাইল নম্বরের সঙ্গে কোনো আবেদন পাওয়া যায়নি।",
    };
  }

  return {
    result: {
      trackingId: row.tracking_id,
      receiptNumber: row.receipt_number,
      centerName: row.center_name,
      serviceName: row.service_name,
      status: row.application_status,
      totalFee: Number(row.total_fee),
      submittedAt: row.submitted_at,
      completedAt: row.completed_at,
      updatedAt: row.updated_at,
    },
  };
}
