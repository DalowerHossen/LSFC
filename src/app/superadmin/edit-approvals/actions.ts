"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const reviewSchema = z.object({
  requestId: z.uuid(),
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional(),
});

export async function superAdminReviewCorrectionAction(formData: FormData) {
  await requireRole(["super_admin"]);
  const parsed = reviewSchema.safeParse({
    requestId: formData.get("requestId"),
    decision: formData.get("decision"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.rpc("super_admin_review_edit_request", {
    request_id: parsed.data.requestId,
    approve: parsed.data.decision === "approve",
    note: parsed.data.note ?? null,
  });

  revalidatePath("/superadmin/edit-approvals");
  revalidatePath("/owner/edit-requests");
  revalidatePath("/operator/edit-requests");
  revalidatePath("/owner/applications");
}
