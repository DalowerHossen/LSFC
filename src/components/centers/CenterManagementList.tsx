import Link from "next/link";
import {
  Ban,
  Building2,
  CheckCircle2,
  MapPin,
  PauseCircle,
  Phone,
  RotateCcw,
  UserPlus,
} from "lucide-react";
import { transitionCenterStatusAction } from "@/app/superadmin/tenants/actions";
import type { CenterRecord, CenterStatus } from "@/types/center";

const statusContent: Record<CenterStatus, { label: string; className: string }> = {
  pending: { label: "অপেক্ষমাণ", className: "bg-amber-50 text-amber-800" },
  active: { label: "সক্রিয়", className: "bg-emerald-50 text-emerald-800" },
  suspended: { label: "স্থগিত", className: "bg-blue-50 text-blue-800" },
  blocked: { label: "অবরুদ্ধ", className: "bg-red-50 text-red-700" },
};
const locationLabels = {
  union_upazila: "ইউনিয়ন পর্যায়",
  upazila_sadar: "উপজেলা সদর",
  pourashava: "পৌরসভা",
  city_corporation_savar: "সিটি কর্পোরেশন / সাভার",
};

export function CenterManagementList({ centers }: { centers: CenterRecord[] }) {
  if (centers.length === 0) {
    return <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center"><Building2 className="mx-auto size-10 text-brand/40" /><h2 className="mt-4 text-base font-extrabold">কোনো কেন্দ্র পাওয়া যায়নি</h2></div>;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {centers.map((center) => {
        const status = statusContent[center.status];
        return (
          <article key={center.id} className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Building2 className="size-5" /></div>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-extrabold">{center.name}</h2><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${status.className}`}>{status.label}</span></div><p className="mt-1 font-mono text-[10px] font-bold text-brand">{center.code}</p></div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Info icon={MapPin} text={`${center.upazila}, ${center.district}, ${center.division}`} />
                <Info icon={Phone} text={center.phone} mono />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[9px] text-muted"><span className="rounded-md bg-[#f7faf8] px-2.5 py-1.5">{locationLabels[center.locationType]}</span>{center.licenseNumber && <span className="rounded-md bg-[#f7faf8] px-2.5 py-1.5 font-mono">License: {center.licenseNumber}</span>}</div>
              <Link href={`/superadmin/tenants/${center.id}/owner`} className="mt-4 flex h-9 w-fit items-center gap-2 rounded-lg border border-brand/20 px-3 text-[10px] font-bold text-brand hover:bg-brand-soft"><UserPlus className="size-3.5" /> পরিচালক নিয়োগ</Link>
            </div>

            <form action={transitionCenterStatusAction} className="border-t border-border bg-[#fbfcfb] p-4 sm:px-6">
              <input type="hidden" name="centerId" value={center.id} />
              <input name="reason" required minLength={5} maxLength={1000} placeholder="সিদ্ধান্তের কারণ লিখুন" className="h-10 w-full rounded-lg border border-border bg-white px-3 text-xs outline-none focus:border-brand" />
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                {center.status === "pending" && <Action value="active" label="অনুমোদন" icon={CheckCircle2} primary />}
                {center.status === "active" && <Action value="suspended" label="স্থগিত" icon={PauseCircle} />}
                {(center.status === "suspended" || center.status === "blocked") && <Action value="active" label="পুনরায় সক্রিয়" icon={RotateCcw} primary />}
                {center.status !== "blocked" && <Action value="blocked" label="Block" icon={Ban} danger />}
              </div>
            </form>
          </article>
        );
      })}
    </div>
  );
}

function Action({ value, label, icon: Icon, primary = false, danger = false }: { value: CenterStatus; label: string; icon: typeof CheckCircle2; primary?: boolean; danger?: boolean }) {
  return <button type="submit" name="targetStatus" value={value} className={`flex h-9 items-center gap-2 rounded-lg px-3 text-[10px] font-bold ${primary ? "bg-brand text-white" : danger ? "border border-red-200 text-red-700 hover:bg-red-50" : "border border-border bg-white text-muted"}`}><Icon className="size-3.5" />{label}</button>;
}

function Info({ icon: Icon, text, mono = false }: { icon: typeof MapPin; text: string; mono?: boolean }) {
  return <div className="flex items-center gap-2 rounded-lg bg-[#f7faf8] px-3 py-2.5 text-[10px] text-muted"><Icon className="size-3.5 shrink-0 text-brand" /><span className={`truncate ${mono ? "font-mono" : ""}`}>{text}</span></div>;
}
