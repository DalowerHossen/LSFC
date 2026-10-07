"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { WorkflowActionState } from "@/types/application";

const transitionSchema = z.object({
  applicationId: z.uuid(),
  targetStatus: z.enum(["in_progress", "completed"]),
});

export async function transitionApplicationAction(
  _previousState: WorkflowActionState,
  formData: FormData,
): Promise<WorkflowActionState> {
  await requireRole(["operator"]);

  const parsed = transitionSchema.safeParse({
    applicationId: formData.get("applicationId"),
    targetStatus: formData.get("targetStatus"),
  });

  if (!parsed.success) {
    return { error: "আবেদনের অবস্থা পরিবর্তনের অনুরোধটি সঠিক নয়" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_application_status", {
    p_application_id: parsed.data.applicationId,
    p_target_status: parsed.data.targetStatus,
  });

  if (error) {
    return {
      error: "অবস্থা পরিবর্তন করা যায়নি। পেজটি রিফ্রেশ করে বর্তমান অবস্থা যাচাই করুন।",
    };
  }

  revalidatePath("/operator/dashboard");
  revalidatePath("/operator/pending");
  revalidatePath("/operator/completed");

  return { success: true };
}
