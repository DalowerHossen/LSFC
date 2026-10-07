import type { Metadata } from "next";
import { Clock3, MessageCircleWarning, ShieldCheck } from "lucide-react";
import { MessageRetryButton } from "@/components/integrations/MessageRetryButton";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "বার্তা delivery সারি" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  message_kind: string;
  recipient_phone: string;
  status: "pending" | "processing" | "retry_wait" | "delivered" | "dead_letter";
  attempt_count: number;
  next_attempt_at: string;
  delivered_at: string | null;
  last_error_code: string | null;
  created_at: string;
  centers: { code: string; name: string } | null;
};

const kinds: Record<string, string> = {
  application_submitted: "আবেদন গ্রহণ",
  application_in_progress: "আবেদন প্রক্রিয়াধীন",
  application_completed: "আবেদন সম্পন্ন",
  license_expiry_reminder: "লাইসেন্স মেয়াদ স্মারক",
};
const statuses: Record<Row["status"], string> = {
  pending: "অপেক্ষমাণ",
  processing: "প্রক্রিয়াধীন",
  retry_wait: "পুনঃপ্রচেষ্টার অপেক্ষা",
  delivered: "প্রদান নিশ্চিত",
  dead_letter: "হস্তক্ষেপ প্রয়োজন",
};
const badge: Record<Row["status"], string> = {
  pending: "bg-sky-50 text-sky-800",
  processing: "bg-violet-50 text-violet-800",
  retry_wait: "bg-amber-50 text-amber-800",
  delivered: "bg-emerald-50 text-emerald-800",
  dead_letter: "bg-red-50 text-red-800",
};
function maskedPhone(value: string) { return `${value.slice(0, 3)}•••••${value.slice(-3)}`; }
function date(value: string) { return new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" }).format(new Date(value)); }

export default async function MessageDeliveryPage() {
  await requireRole(["super_admin"]);
  const { data } = await (await createClient()).from("message_outbox")
    .select("id,message_kind,recipient_phone,status,attempt_count,next_attempt_at,delivered_at,last_error_code,created_at,centers(code,name)")
    .order("created_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as unknown as Row[];
  return <div>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-brand"><MessageCircleWarning className="size-4" aria-hidden="true" /> বার্তা নিরীক্ষণ</div>
        <h1 className="mt-2 text-2xl font-extrabold">Delivery outbox ও পুনঃপ্রচেষ্টা</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">এখানে provider-neutral event facts দেখা যায়। অনুমোদিত template ও live worker সংযুক্ত না হওয়া পর্যন্ত অপেক্ষমাণ সারি কোনো বার্তা পাঠানোর প্রমাণ নয়।</p>
      </div>
      <span className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800"><ShieldCheck className="size-4" aria-hidden="true" /> AAL2</span>
    </div>
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
      লাইসেন্স reminder endpoint কেবল অনুমোদিত <code>LICENSE_REMINDER_DAYS</code> এবং scheduler secret থাকলে idempotent event তৈরি করে। Delivery worker আলাদাভাবে অনুমোদন ও স্থাপন করতে হবে।
    </div>
    {rows.length === 0 ? <div className="rounded-2xl border border-border bg-white py-20 text-center text-sm text-muted">কোনো বার্তা event নেই</div> :
      <div className="grid gap-4 lg:grid-cols-2">{rows.map((row) => <article key={row.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="flex justify-between gap-3">
          <div><h2 className="text-sm font-extrabold">{kinds[row.message_kind] ?? row.message_kind}</h2><p className="mt-1 text-[10px] text-muted">{row.centers?.name ?? "অজানা কেন্দ্র"} • {row.centers?.code}</p></div>
          <span className={`h-fit rounded-full px-2.5 py-1 text-[9px] font-bold ${badge[row.status]}`}>{statuses[row.status]}</span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#f7faf8] p-3 text-[10px]">
          <div><dt className="text-muted">প্রাপক</dt><dd className="mt-1 font-bold">{maskedPhone(row.recipient_phone)}</dd></div>
          <div><dt className="text-muted">প্রচেষ্টা</dt><dd className="mt-1 font-bold">{row.attempt_count}</dd></div>
          <div><dt className="text-muted">তৈরি</dt><dd className="mt-1 font-bold">{date(row.created_at)}</dd></div>
          <div><dt className="text-muted">পরবর্তী/সম্পন্ন</dt><dd className="mt-1 font-bold">{date(row.delivered_at ?? row.next_attempt_at)}</dd></div>
        </dl>
        {row.last_error_code && <p className="mt-3 flex items-center gap-2 text-[10px] text-red-700"><Clock3 className="size-3.5" aria-hidden="true" /> শেষ error code: {row.last_error_code}</p>}
        {row.status === "dead_letter" && <MessageRetryButton id={row.id} />}
      </article>)}</div>}
  </div>;
}
