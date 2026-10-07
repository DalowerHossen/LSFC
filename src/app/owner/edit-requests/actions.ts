"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const reviewSchema = z.object({
  requestId: z.uuid(),
  decision: z.enum(["forward", "reject"]),
  note: z.string().trim().max(500).optional(),
});

export async function reviewCorrectionAction(formData: FormData) {
  await requireRole(["owner"]);
  const parsed = reviewSchema.safeParse({
    requestId: formData.get("requestId"),
    decision: formData.get("decision"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.rpc("owner_review_edit_request", {
    request_id: parsed.data.requestId,
    forward_to_super_admin: parsed.data.decision === "forward",
    note: parsed.data.note ?? null,
  });
  revalidatePath("/owner/edit-requests");
  revalidatePath("/operator/edit-requests");
  revalidatePath("/owner/dashboard");
}
