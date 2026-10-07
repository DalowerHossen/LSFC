"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type CenterNoticeState = { error?: string; success?: string };
const optionalDate = z.string().refine((value) => !Number.isNaN(Date.parse(value))).optional();
const schema = z.object({
  noticeId: z.uuid().optional(), title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(10).max(5000), priority: z.coerce.number().int().min(0).max(3),
  startsAt: optionalDate, endsAt: optionalDate, publish: z.boolean(),
}).refine((value) => !value.startsAt || !value.endsAt || Date.parse(value.endsAt) > Date.parse(value.startsAt), { message: "শেষ সময় শুরুর সময়ের পরে হতে হবে" });

export async function saveCenterNoticeAction(_state: CenterNoticeState, formData: FormData): Promise<CenterNoticeState> {
  await requireRole(["owner"]);
  const parsed = schema.safeParse({ noticeId: formData.get("noticeId") || undefined, title: formData.get("title"), body: formData.get("body"), priority: formData.get("priority"), startsAt: formData.get("startsAt") || undefined, endsAt: formData.get("endsAt") || undefined, publish: formData.get("publish") === "on" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "নোটিশের তথ্য যাচাই করুন" };
  const { error } = await (await createClient()).rpc("save_center_notice", {
    p_notice_id: parsed.data.noticeId ?? null, p_title: parsed.data.title, p_body: parsed.data.body,
    p_priority: parsed.data.priority, p_starts_at: parsed.data.startsAt ? new Date(parsed.data.startsAt).toISOString() : null,
    p_ends_at: parsed.data.endsAt ? new Date(parsed.data.endsAt).toISOString() : null, p_publish: parsed.data.publish,
  });
  if (error) return { error: "নোটিশ সংরক্ষণ করা যায়নি। তথ্য যাচাই করে আবার চেষ্টা করুন।" };
  revalidatePath("/owner/notices"); revalidatePath("/operator/notices");
  return { success: parsed.data.publish ? "নোটিশ প্রকাশিত হয়েছে।" : "খসড়া নোটিশ সংরক্ষিত হয়েছে।" };
}
