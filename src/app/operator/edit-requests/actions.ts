"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type CorrectionActionState = {
  error?: string;
  success?: boolean;
};

const requestSchema = z.object({
  applicationId: z.uuid(),
  fieldName: z.enum(["citizen_name", "citizen_mobile", "government_fee"]),
  proposedValue: z.string().trim().min(1).max(120),
  reason: z.string().trim().min(10, "কারণ কমপক্ষে ১০ অক্ষরে লিখুন").max(1000),
});

export async function requestCorrectionAction(
  _previousState: CorrectionActionState,
  formData: FormData,
): Promise<CorrectionActionState> {
  await requireRole(["operator"]);
  const parsed = requestSchema.safeParse({
    applicationId: formData.get("applicationId"),
    fieldName: formData.get("fieldName"),
    proposedValue: formData.get("proposedValue"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "তথ্য যাচাই করুন" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("request_application_correction", {
    p_application_id: parsed.data.applicationId,
    p_field_name: parsed.data.fieldName,
    p_proposed_value: parsed.data.proposedValue,
    p_reason: parsed.data.reason,
  });

  if (error) {
    return { error: "অনুরোধ তৈরি করা যায়নি। একই আবেদনের কোনো অনুরোধ অপেক্ষমাণ আছে কি না যাচাই করুন।" };
  }

  revalidatePath("/operator/edit-requests");
  revalidatePath("/owner/edit-requests");
  return { success: true };
}
