"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type CenterActionState = {
  error?: string;
  success?: string;
};

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
  z.string().nullable(),
);

const centerSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^LSFC-[A-Z0-9-]{3,24}$/, "Center code-এর format সঠিক নয়"),
  name: z.string().trim().min(3).max(160),
  locationType: z.enum(["union_upazila", "upazila_sadar", "pourashava", "city_corporation_savar"]),
  division: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  upazila: z.string().trim().min(2).max(80),
  unionOrWard: optionalText,
  address: z.string().trim().min(5).max(500),
  phone: z.string().regex(/^01[3-9][0-9]{8}$/, "সঠিক মোবাইল নম্বর লিখুন"),
  email: z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
    z.email("সঠিক ইমেইল লিখুন").nullable(),
  ),
  licenseNumber: optionalText,
  licenseExpiresAt: z.preprocess(
    (value) => (typeof value === "string" && value ? value : null),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  ),
});

export async function createCenterAction(
  _previousState: CenterActionState,
  formData: FormData,
): Promise<CenterActionState> {
  await requireRole(["super_admin"]);
  const parsed = centerSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    locationType: formData.get("locationType"),
    division: formData.get("division"),
    district: formData.get("district"),
    upazila: formData.get("upazila"),
    unionOrWard: formData.get("unionOrWard"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    licenseNumber: formData.get("licenseNumber"),
    licenseExpiresAt: formData.get("licenseExpiresAt"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "কেন্দ্রের তথ্য যাচাই করুন" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_center", {
    p_code: parsed.data.code,
    p_name: parsed.data.name,
    p_location_type: parsed.data.locationType,
    p_division: parsed.data.division,
    p_district: parsed.data.district,
    p_upazila: parsed.data.upazila,
    p_union_or_ward: parsed.data.unionOrWard,
    p_address: parsed.data.address,
    p_phone: parsed.data.phone,
    p_email: parsed.data.email,
    p_license_number: parsed.data.licenseNumber,
    p_license_expires_at: parsed.data.licenseExpiresAt,
  });

  if (error) {
    return { error: "কেন্দ্র তৈরি করা যায়নি। Code বা license number আগে ব্যবহৃত হয়েছে কি না যাচাই করুন।" };
  }

  revalidatePath("/superadmin/tenants");
  return { success: `${parsed.data.code} কেন্দ্রটি Pending অবস্থায় তৈরি হয়েছে।` };
}

const transitionSchema = z.object({
  centerId: z.uuid(),
  targetStatus: z.enum(["active", "suspended", "blocked"]),
  reason: z.string().trim().min(5).max(1000),
});

export async function transitionCenterStatusAction(formData: FormData) {
  await requireRole(["super_admin"]);
  const parsed = transitionSchema.safeParse({
    centerId: formData.get("centerId"),
    targetStatus: formData.get("targetStatus"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.rpc("transition_center_status", {
    p_center_id: parsed.data.centerId,
    p_target_status: parsed.data.targetStatus,
    p_reason: parsed.data.reason,
  });
  revalidatePath("/superadmin/tenants");
  revalidatePath("/superadmin/dashboard");
}
