"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type FeeActionState = { error?: string; success?: string };
const location = z.enum(["union_upazila", "upazila_sadar", "pourashava", "city_corporation_savar"]);
const reason = z.string().trim().min(10, "পরিবর্তনের কারণ কমপক্ষে ১০ অক্ষরের হতে হবে").max(500);
const amount = z.coerce.number().min(0, "ফি ঋণাত্মক হতে পারবে না").max(1_000_000);

const serviceSchema = z.object({ serviceCode: z.string().min(2).max(80), locationType: location, assistanceFee: amount, extraPageFee: amount, reason });
const licenseSchema = z.object({ locationType: location, fee: amount, reason });

export async function updateServiceFeeAction(_state: FeeActionState, formData: FormData): Promise<FeeActionState> {
  await requireRole(["super_admin"]);
  const parsed = serviceSchema.safeParse({ serviceCode: formData.get("serviceCode"), locationType: formData.get("locationType"), assistanceFee: formData.get("assistanceFee"), extraPageFee: formData.get("extraPageFee"), reason: formData.get("reason") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "ফি তথ্য যাচাই করুন" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_service_fee", { p_service_code: parsed.data.serviceCode, p_location_type: parsed.data.locationType, p_assistance_fee: parsed.data.assistanceFee, p_extra_page_fee: parsed.data.extraPageFee, p_reason: parsed.data.reason });
  if (error) return { error: error.message.includes("unchanged") ? "বর্তমান ফি থেকে কোনো পরিবর্তন হয়নি।" : "Appendix-7 ফি আপডেট করা যায়নি।" };
  revalidatePath("/superadmin/fees"); revalidatePath("/operator/new-application");
  return { success: "Appendix-7 ফি সফলভাবে আপডেট ও audit করা হয়েছে।" };
}

export async function updateLicenseFeeAction(_state: FeeActionState, formData: FormData): Promise<FeeActionState> {
  await requireRole(["super_admin"]);
  const parsed = licenseSchema.safeParse({ locationType: formData.get("locationType"), fee: formData.get("fee"), reason: formData.get("reason") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "ফি তথ্য যাচাই করুন" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_license_fee", { p_location_type: parsed.data.locationType, p_fee: parsed.data.fee, p_reason: parsed.data.reason });
  if (error) return { error: error.message.includes("unchanged") ? "বর্তমান ফি থেকে কোনো পরিবর্তন হয়নি।" : "Appendix-6 ফি আপডেট করা যায়নি।" };
  revalidatePath("/superadmin/fees");
  return { success: "Appendix-6 লাইসেন্স ফি সফলভাবে আপডেট ও audit করা হয়েছে।" };
}
