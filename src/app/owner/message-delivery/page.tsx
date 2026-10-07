import type { Metadata } from "next";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "বার্তা প্রদানের ইতিহাস" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  message_kind: string;
  recipient_phone: string;
  status: "pending" | "processing" | "retry_wait" | "delivered" | "dead_letter";
  attempt_count: number;
  delivered_at: string | null;
  next_attempt_at: string;
  last_error_code: string | null;
  created_at: string;
};
const kind: Record<string, string> = {
  application_submitted: "আবেদন গ্রহণ",
  application_in_progress: "আবেদন প্রক্রিয়াধীন",
  application_completed: "আবেদন সম্পন্ন",
  license_expiry_reminder: "লাইসেন্স মেয়াদ স্মারক",
};
const status: Record<Row["status"], string> = {
  pending: "অপেক্ষমাণ",
  processing: "প্রক্রিয়াধীন",
  retry_wait: "পুনঃপ্রচেষ্টার অপেক্ষা",
  delivered: "প্রদান নিশ্চিত",
  dead_letter: "প্রশাসনিক পর্যালোচনা প্রয়োজন",
};
function time(value: string) { return new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" }).format(new Date(value)); }
function phone(value: string) { return `${value.slice(0, 3)}•••••${value.slice(-3)}`; }

export default async function OwnerMessageDeliveryPage() {
  await requireRole(["owner"]);
  const { data } = await (await createClient()).from("message_outbox")
    .select("id,message_kind,recipient_phone,status,attempt_count,delivered_at,next_attempt_at,last_error_code,created_at")
    .order("created_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as Row[];
  return <div>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="flex items-center gap-2 text-xs font-bold text-brand"><MessageCircle className="size-4" aria-hidden="true" /> কেন্দ্রের বার্তা নিরীক্ষণ</p><h1 className="mt-2 text-2xl font-extrabold">বার্তা প্রদানের ইতিহাস</h1><p className="mt-2 text-sm text-muted">শুধু আপনার কেন্দ্রের tenant-scoped event ও provider ফলাফল দেখা যায়। অপেক্ষমাণ event পাঠানো হয়েছে—এমন প্রমাণ নয়।</p></div>
      <span className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800"><ShieldCheck className="size-4" aria-hidden="true" /> AAL2 ও RLS</span>
    </div>
    {rows.length === 0 ? <div className="rounded-2xl border border-border bg-white py-20 text-center text-sm text-muted">কোনো বার্তা event নেই</div> : <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><caption className="sr-only">কেন্দ্রের সর্বশেষ ১০০টি বার্তা event</caption><thead className="bg-[#f3f7f5] text-muted"><tr><th scope="col" className="p-4">ধরন</th><th scope="col" className="p-4">প্রাপক</th><th scope="col" className="p-4">অবস্থা</th><th scope="col" className="p-4">প্রচেষ্টা</th><th scope="col" className="p-4">সময়</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-border"><th scope="row" className="p-4 font-bold">{kind[row.message_kind] ?? row.message_kind}</th><td className="p-4 font-mono">{phone(row.recipient_phone)}</td><td className="p-4"><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${row.status === "delivered" ? "bg-emerald-50 text-emerald-800" : row.status === "dead_letter" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}>{status[row.status]}</span>{row.last_error_code && <span className="mt-1 block text-[9px] text-red-700">{row.last_error_code}</span>}</td><td className="p-4">{row.attempt_count}</td><td className="p-4 text-muted">{time(row.delivered_at ?? (row.status === "retry_wait" ? row.next_attempt_at : row.created_at))}</td></tr>)}</tbody></table></div></div>}
  </div>;
}
