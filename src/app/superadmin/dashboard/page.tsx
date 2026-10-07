import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  ClipboardList,
  FileCheck2,
  MapPinned,
  ShieldCheck,
  Users,
} from "lucide-react";
import { DashboardTrendChart,type DashboardTrendPoint } from "@/components/dashboard/DashboardTrendChart";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "সুপার অ্যাডমিন ড্যাশবোর্ড" };

type Metrics = {
  total_centers: number | string; active_centers: number | string;
  pending_centers: number | string; suspended_centers: number | string;
  blocked_centers: number | string; today_applications: number | string;
  today_completed: number | string; today_service_value: number | string;
  active_users: number | string; pending_corrections: number | string;
};
type District = {
  district: string; center_count: number | string; active_center_count: number | string;
  application_count: number | string; completed_count: number | string; service_value: number | string;
};
const number = new Intl.NumberFormat("bn-BD");
const money = new Intl.NumberFormat("bn-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 });

export default async function SuperAdminDashboardPage() {
  const context = await requireRole(["super_admin"]);
  const supabase = await createClient();
  const [{ data: metricsData }, { data: districtData }, { data: trendData }] = await Promise.all([
    supabase.rpc("super_admin_dashboard_metrics"),
    supabase.rpc("super_admin_district_analytics", { p_limit: 5 }),
    supabase.rpc("dashboard_application_trend", { p_days: 14 }),
  ]);
  const row = (Array.isArray(metricsData) ? metricsData[0] : metricsData) as Metrics | null;
  const metrics = {
    totalCenters: Number(row?.total_centers ?? 0), activeCenters: Number(row?.active_centers ?? 0),
    pendingCenters: Number(row?.pending_centers ?? 0), suspendedCenters: Number(row?.suspended_centers ?? 0),
    blockedCenters: Number(row?.blocked_centers ?? 0), todayApplications: Number(row?.today_applications ?? 0),
    todayCompleted: Number(row?.today_completed ?? 0), todayValue: Number(row?.today_service_value ?? 0),
    activeUsers: Number(row?.active_users ?? 0), pendingCorrections: Number(row?.pending_corrections ?? 0),
  };
  const districts = ((districtData ?? []) as District[]).map((item) => ({
    district: item.district, centers: Number(item.center_count), activeCenters: Number(item.active_center_count),
    applications: Number(item.application_count), completed: Number(item.completed_count), value: Number(item.service_value),
  }));
  const maxApplications = Math.max(...districts.map((item) => item.applications), 1);

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold text-brand">জাতীয় প্ল্যাটফর্ম সারাংশ</p><h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">স্বাগতম, {context.fullName}</h1><p className="mt-2 text-sm text-muted">সকল কেন্দ্রের live non-PII operational overview।</p></div>
        <div className="flex w-fit items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-semibold text-muted"><CalendarDays className="size-4 text-brand" />{new Intl.DateTimeFormat("bn-BD", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}</div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="মোট কেন্দ্র" value={number.format(metrics.totalCenters)} helper={`${number.format(metrics.activeCenters)}টি Active`} icon={Building2} tone="green" />
        <Metric label="আজকের আবেদন" value={number.format(metrics.todayApplications)} helper={`${number.format(metrics.todayCompleted)}টি আজ সম্পন্ন`} icon={ClipboardList} tone="blue" />
        <Metric label="আজকের সেবা মূল্য" value={money.format(metrics.todayValue)} helper="সরকারি ও সহায়তা ফিসহ" icon={Banknote} tone="amber" />
        <Metric label="সক্রিয় ব্যবহারকারী" value={number.format(metrics.activeUsers)} helper={`${number.format(metrics.pendingCorrections)}টি final approval অপেক্ষমাণ`} icon={Users} tone="rose" />
      </div>

      <div className="mt-6"><DashboardTrendChart points={(trendData??[]) as DashboardTrendPoint[]} title="দেশব্যাপী গত ১৪ দিনের কার্যক্রম"/></div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-base font-extrabold">শীর্ষ জেলার কার্যক্রম</h2><p className="mt-1 text-[10px] text-muted">Application volume অনুযায়ী</p></div><Link href="/superadmin/analytics" className="flex items-center gap-1.5 text-[10px] font-bold text-brand">বিস্তারিত <ArrowLeft className="size-3.5" /></Link></div>
          {districts.length === 0 ? <div className="py-14 text-center text-xs text-muted">এখনো analytics data নেই</div> : <div className="mt-6 space-y-5">{districts.map((district) => <div key={district.district}><div className="mb-2 flex items-end justify-between gap-3"><div><p className="text-xs font-bold">{district.district}</p><p className="mt-1 text-[9px] text-muted">{number.format(district.activeCenters)}/{number.format(district.centers)} Active center</p></div><div className="text-right"><p className="text-xs font-extrabold text-brand">{number.format(district.applications)} আবেদন</p><p className="mt-1 text-[9px] text-muted">{money.format(district.value)}</p></div></div><div className="h-2 overflow-hidden rounded-full bg-brand-soft"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.max((district.applications / maxApplications) * 100, 3)}%` }} /></div></div>)}</div>}
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6"><h2 className="text-base font-extrabold">কেন্দ্রের অবস্থা</h2><div className="mt-5 grid grid-cols-2 gap-3"><Status label="সক্রিয়" value={metrics.activeCenters} className="bg-emerald-50 text-emerald-800" /><Status label="অপেক্ষমাণ" value={metrics.pendingCenters} className="bg-amber-50 text-amber-800" /><Status label="স্থগিত" value={metrics.suspendedCenters} className="bg-blue-50 text-blue-800" /><Status label="অবরুদ্ধ" value={metrics.blockedCenters} className="bg-red-50 text-red-700" /></div></section>
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm"><div className="grid gap-2"><QuickLink href="/superadmin/tenants" icon={Building2} label="কেন্দ্র ব্যবস্থাপনা" /><QuickLink href="/superadmin/edit-approvals" icon={FileCheck2} label="সংশোধন অনুমোদন" /><QuickLink href="/superadmin/analytics" icon={MapPinned} label="Nationwide analytics" /></div><div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-soft/60 p-3 text-[10px] font-semibold text-brand"><ShieldCheck className="size-4" /> সব aggregate AAL2-protected</div></section>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, helper, icon: Icon, tone }: { label: string; value: string; helper: string; icon: typeof Building2; tone: "green" | "blue" | "amber" | "rose" }) {
  const colors = { green: "bg-emerald-50 text-emerald-700", blue: "bg-blue-50 text-blue-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700" };
  return <article className="rounded-2xl border border-border bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-muted">{label}</p><p className="mt-3 text-2xl font-extrabold">{value}</p></div><div className={`grid size-10 place-items-center rounded-xl ${colors[tone]}`}><Icon className="size-5" /></div></div><p className="mt-4 border-t border-border pt-3 text-[10px] text-muted">{helper}</p></article>;
}
function Status({ label, value, className }: { label: string; value: number; className: string }) { return <div className={`rounded-xl p-3.5 ${className}`}><p className="text-[10px] font-bold">{label}</p><p className="mt-1 text-xl font-extrabold">{number.format(value)}</p></div>; }
function QuickLink({ href, icon: Icon, label }: { href: string; icon: typeof Building2; label: string }) { return <Link href={href} className="flex items-center gap-3 rounded-xl border border-border p-3 text-xs font-bold hover:border-brand/30 hover:bg-brand-soft/30"><Icon className="size-4 text-brand" /><span className="flex-1">{label}</span><ArrowLeft className="size-3.5 text-muted" /></Link>; }
