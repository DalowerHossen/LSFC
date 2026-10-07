import type { Metadata } from "next";
import { Fingerprint, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "কার্যক্রম নিরীক্ষা" };
export const dynamic = "force-dynamic";
const dateTime = new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" });

export default async function OwnerAuditLogsPage() {
  await requireRole(["owner"]);
  const { data } = await (await createClient())
    .from("audit_logs")
    .select("id,sequence_number,action,entity_type,entity_id,actor_id,ip_address,user_agent,created_at,entry_hash")
    .order("sequence_number", { ascending: false })
    .limit(100);

  return (
    <div>
      <div className="mb-7"><div className="flex items-center gap-2 text-xs font-bold text-brand"><Fingerprint className="size-4" /> অপরিবর্তনীয় কার্যক্রম রেকর্ড</div><h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">কেন্দ্রের নিরীক্ষা লগ</h1><p className="mt-2 text-sm leading-7 text-muted">সর্বশেষ ১০০টি কার্যক্রম দেখানো হচ্ছে। এই লগ পরিবর্তন বা মুছে ফেলা যায় না।</p></div>
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        {!data?.length ? <p className="p-8 text-center text-sm text-muted">কোনো কার্যক্রম রেকর্ড পাওয়া যায়নি।</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-[#f3f7f5] text-[10px] text-muted"><tr><th className="p-4">ক্রম</th><th className="p-4">সময়</th><th className="p-4">কার্যক্রম</th><th className="p-4">রেকর্ড</th><th className="p-4">ব্যবহারকারী</th><th className="p-4">আইপি</th><th className="p-4">হ্যাশ যাচাই</th></tr></thead><tbody>{data.map((row) => <tr key={row.id} className="border-t border-border align-top"><td className="p-4 font-mono">{new Intl.NumberFormat("bn-BD").format(Number(row.sequence_number))}</td><td className="whitespace-nowrap p-4">{dateTime.format(new Date(row.created_at))}</td><td className="p-4 font-semibold text-brand">{row.action}</td><td className="p-4"><span className="block">{row.entity_type}</span><span className="mt-1 block font-mono text-[9px] text-muted">{row.entity_id ?? "—"}</span></td><td className="p-4 font-mono text-[9px]">{row.actor_id ?? "সিস্টেম"}</td><td className="p-4 font-mono text-[10px]">{row.ip_address ?? "পাওয়া যায়নি"}</td><td className="p-4"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-800"><ShieldCheck className="size-3" /> {row.entry_hash.slice(0, 12)}…</span></td></tr>)}</tbody></table></div>}
      </div>
      <p className="mt-4 text-[10px] leading-5 text-muted">ডিভাইসের ব্রাউজার পরিচিতি ডেটাবেজে সংরক্ষিত থাকে; গোপনীয়তা ও নিরাপত্তার কারণে এই সংক্ষিপ্ত তালিকায় তা প্রদর্শন করা হয়নি। পূর্ণ চেইন যাচাই সুপার অ্যাডমিন নিরাপত্তা প্যানেলে সম্পন্ন হয়।</p>
    </div>
  );
}
