import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileEdit,
  PenLine,
  Users,
} from "lucide-react";
import { DashboardTrendChart,type DashboardTrendPoint } from "@/components/dashboard/DashboardTrendChart";
import { listApplications } from "@/lib/applications/list";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "পরিচালক ড্যাশবোর্ড" };

type MetricsRow = {
  today_applications: number | string;
  today_completed: number | string;
  active_applications: number | string;
  today_collected: number | string;
  active_staff: number | string;
  pending_edit_requests: number | string;
};

const number = new Intl.NumberFormat("bn-BD");
const money = new Intl.NumberFormat("bn-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 2,
});
const dateTime = new Intl.DateTimeFormat("bn-BD", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export default async function OwnerDashboardPage() {
  const context = await requireRole(["owner"]);
  const supabase = await createClient();
  const [{ data }, recentApplications, { data: trendData }] = await Promise.all([
    supabase.rpc("owner_dashboard_metrics"),
    listApplications(["submitted", "in_progress", "completed"]),
    supabase.rpc("dashboard_application_trend", { p_days: 14 }),
  ]);
  const row = (Array.isArray(data) ? data[0] : data) as MetricsRow | null;
  const metrics = {
    todayApplications: Number(row?.today_applications ?? 0),
    todayCompleted: Number(row?.today_completed ?? 0),
    activeApplications: Number(row?.active_applications ?? 0),
    todayCollected: Number(row?.today_collected ?? 0),
    activeStaff: Number(row?.active_staff ?? 0),
    pendingEdits: Number(row?.pending_edit_requests ?? 0),
  };

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold text-brand">কেন্দ্র পরিচালনার সারাংশ</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">স্বাগতম, {context.fullName}</h1>
          <p className="mt-2 text-sm leading-7 text-muted">{context.centerName} Centerের আজকের live Action।</p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-semibold text-muted"><CalendarDays className="size-4 text-brand" />{new Intl.DateTimeFormat("bn-BD", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}</div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="আজকের আবেদন" value={number.format(metrics.todayApplications)} helper={`${number.format(metrics.activeApplications)}টি বর্তমানে চলমান`} icon={ClipboardList} tone="green" />
        <Metric label="আজ সম্পন্ন" value={number.format(metrics.todayCompleted)} helper="বাংলাদেশ সময় অনুযায়ী" icon={CheckCircle2} tone="blue" />
        <Metric label="আজকের আদায়" value={money.format(metrics.todayCollected)} helper="সরকারি ও সহায়তা ফিসহ" icon={Banknote} tone="amber" />
        <Metric label="সক্রিয় কর্মচারী" value={number.format(metrics.activeStaff)} helper={`${number.format(metrics.pendingEdits)}টি সংশোধন অপেক্ষমাণ`} icon={Users} tone="rose" />
      </div>

      <div className="mt-6"><DashboardTrendChart points={(trendData??[]) as DashboardTrendPoint[]}/></div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
            <div><h2 className="text-base font-extrabold">সাম্প্রতিক আবেদন</h2><p className="mt-1 text-[10px] text-muted">সর্বশেষ পাঁচটি কার্যক্রম</p></div>
            <Link href="/owner/applications" className="flex items-center gap-1.5 text-[10px] font-bold text-brand">সব দেখুন <ArrowLeft className="size-3.5" /></Link>
          </div>
          {recentApplications.length === 0 ? (
            <div className="px-6 py-14 text-center text-xs text-muted">এখনো কোনো আবেদন নেই</div>
          ) : (
            <div className="divide-y divide-border px-5 sm:px-6">
              {recentApplications.slice(0, 5).map((application) => (
                <div key={application.id} className="flex items-center gap-4 py-4">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><ClipboardList className="size-4" /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{application.serviceName}</p><p className="mt-1 truncate font-mono text-[9px] text-muted">{application.trackingId} • {application.citizenName}</p></div>
                  <div className="text-right"><p className="text-xs font-extrabold text-brand">{money.format(application.totalFee)}</p><p className="mt-1 flex items-center justify-end gap-1 text-[9px] text-muted"><Clock3 className="size-3" />{dateTime.format(new Date(application.createdAt))}</p></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-extrabold">দ্রুত কার্যক্রম</h2>
          <p className="mt-1 text-[10px] text-muted">কেন্দ্র পরিচালনার গুরুত্বপূর্ণ কাজ</p>
          <div className="mt-5 space-y-3">
            <QuickLink href="/owner/applications" icon={ClipboardList} title="আবেদন পর্যবেক্ষণ" description="সকল অবস্থা ও ফি দেখুন" />
            <QuickLink href="/owner/staff" icon={Users} title="কর্মচারী পরিচালনা" description="Account ও প্রবেশাধিকার নিয়ন্ত্রণ" />
            <QuickLink href="/owner/signature" icon={PenLine} title="ডিজিটাল স্বাক্ষর" description="রশিদের স্বাক্ষর সংস্করণ" />
            <QuickLink href="/owner/edit-requests" icon={FileEdit} title="সংশোধন অনুরোধ" description={`${number.format(metrics.pendingEdits)}টি Center পরিচালকের পর্যালোচনা অপেক্ষমাণ`} />
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, helper, icon: Icon, tone }: { label: string; value: string; helper: string; icon: typeof ClipboardList; tone: "green" | "blue" | "amber" | "rose" }) {
  const colors = { green: "bg-emerald-50 text-emerald-700", blue: "bg-blue-50 text-blue-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700" };
  return <article className="rounded-2xl border border-border bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-muted">{label}</p><p className="mt-3 text-2xl font-extrabold">{value}</p></div><div className={`grid size-10 place-items-center rounded-xl ${colors[tone]}`}><Icon className="size-5" /></div></div><p className="mt-4 border-t border-border pt-3 text-[10px] text-muted">{helper}</p></article>;
}

function QuickLink({ href, icon: Icon, title, description }: { href: string; icon: typeof ClipboardList; title: string; description: string }) {
  return <Link href={href} className="flex items-center gap-3 rounded-xl border border-border p-3.5 transition hover:border-brand/25 hover:bg-brand-soft/30"><div className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><Icon className="size-4" /></div><div className="min-w-0 flex-1"><p className="text-xs font-bold">{title}</p><p className="mt-1 text-[9px] text-muted">{description}</p></div><ArrowLeft className="size-3.5 text-muted" /></Link>;
}
