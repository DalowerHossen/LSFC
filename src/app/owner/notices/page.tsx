import type { Metadata } from "next";
import { CenterNoticeForm } from "@/components/content/CenterNoticeForm";
import { NoticeBoard } from "@/components/content/NoticeBoard";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "নোটিশ বোর্ড" };
export const dynamic = "force-dynamic";

export default async function OwnerNoticesPage() {
  await requireRole(["owner"]);
  const supabase = await createClient();
  const [{ data: centerNotices }, { data: centralNotices }] = await Promise.all([
    supabase.from("center_notices").select("id,title,body,priority,published_at").eq("status", "প্রকাশed").order("priority", { ascending: false }).order("published_at", { ascending: false }),
    supabase.from("central_notices").select("id,title,body,priority,published_at").order("priority", { ascending: false }).order("published_at", { ascending: false }),
  ]);
  return <div className="space-y-10"><CenterNoticeForm /><NoticeBoard notices={centerNotices ?? []} title="আমার কেন্দ্রের প্রকাশিত নোটিশ" kicker="কেন্দ্রের অভ্যন্তরীণ নোটিশ" /><NoticeBoard notices={centralNotices ?? []} title="কেন্দ্রীয় নোটিশসমূহ" /></div>;
}
