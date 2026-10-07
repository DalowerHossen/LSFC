"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type MessageRetryState = { error?: string; success?: string };

export async function retryDeadLetterMessageAction(_state: MessageRetryState, formData: FormData): Promise<MessageRetryState> {
  await requireRole(["super_admin"]);
  const parsed = z.uuid().safeParse(formData.get("messageId"));
  if (!parsed.success) return { error: "বার্তা রেকর্ডটি সঠিক নয়।" };
  const { error } = await (await createClient()).rpc("retry_dead_letter_message", { p_outbox_id: parsed.data });
  if (error) return { error: "বার্তাটি পুনরায় সারিতে রাখা যায়নি।" };
  revalidatePath("/superadmin/message-delivery");
  return { success: "বার্তাটি নতুন delivery প্রচেষ্টার জন্য সারিতে রাখা হয়েছে।" };
}
