import type { Metadata } from "next";
import { NoticeBoard } from "@/components/content/NoticeBoard";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "নোটিশ বোর্ড" };
export const dynamic = "force-dynamic";

export default async function OperatorNoticesPage() {
  await requireRole(["operator"]);
  const supabase = await createClient();
  const [{ data: centerNotices }, { data: centralNotices }] = await Promise.all([
    supabase.from("center_notices").select("id,title,body,priority,published_at").order("priority", { ascending: false }).order("published_at", { ascending: false }),
    supabase.from("central_notices").select("id,title,body,priority,published_at").order("priority", { ascending: false }).order("published_at", { ascending: false }),
  ]);
  return <div className="space-y-10"><NoticeBoard notices={centerNotices ?? []} title="কেন্দ্র পরিচালকের নোটিশ" kicker="আমার কেন্দ্র" /><NoticeBoard notices={centralNotices ?? []} title="কেন্দ্রীয় নোটিশসমূহ" /></div>;
}
