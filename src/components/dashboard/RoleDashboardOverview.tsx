import {
  Activity,
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Clock3,
  FileCheck2,
  FilePlus2,
  ReceiptText,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/types/auth";

type Metric = {
  label: string;
  helper: string;
  icon: LucideIcon;
  tone: "green" | "blue" | "amber" | "red";
};

const content: Record<
  UserRole,
  {
    eyebrow: string;
    title: string;
    description: string;
    metrics: Metric[];
    tasks: { title: string; description: string; icon: LucideIcon }[];
  }
> = {
  super_admin: {
    eyebrow: "জাতীয় প্ল্যাটফর্ম সারাংশ",
    title: "সুপার অ্যাডমিন ড্যাশবোর্ড",
    description: "কেন্দ্র, সাবস্ক্রিপশন, ফি ও নিরাপত্তা পর্যবেক্ষণের কেন্দ্রীয় স্থান।",
    metrics: [
      { label: "মোট কেন্দ্র", helper: "অনুমোদিত ও অপেক্ষমাণ", icon: Building2, tone: "green" },
      { label: "সক্রিয় ব্যবহারকারী", helper: "সকল ভূমিকা", icon: Users, tone: "blue" },
      { label: "আজকের আবেদন", helper: "দেশব্যাপী", icon: ClipboardList, tone: "amber" },
      { label: "নিরাপত্তা সতর্কতা", helper: "পর্যালোচনার অপেক্ষায়", icon: ShieldCheck, tone: "red" },
    ],
    tasks: [
      { title: "কেন্দ্র অনুমোদন", description: "নতুন নিবন্ধিত কেন্দ্র যাচাই ও অনুমোদন", icon: Building2 },
      { title: "সরকারি ফি যাচাই", description: "কার্যকর ফি ও সংশোধনের ইতিহাস দেখুন", icon: Banknote },
      { title: "অডিট লগ", description: "অপরিবর্তনীয় কার্যক্রমের রেকর্ড পর্যবেক্ষণ", icon: ShieldCheck },
    ],
  },
  owner: {
    eyebrow: "কেন্দ্র পরিচালনার সারাংশ",
    title: "পরিচালক ড্যাশবোর্ড",
    description: "নিজ কেন্দ্রের আবেদন, আয়-ব্যয়, কর্মচারী ও রিপোর্ট এক নজরে।",
    metrics: [
      { label: "আজকের আবেদন", helper: "সকল অপারেটর", icon: ClipboardList, tone: "green" },
      { label: "সম্পন্ন সেবা", helper: "আজকের হিসাব", icon: FileCheck2, tone: "blue" },
      { label: "আজকের আদায়", helper: "সরকারি ও সহায়তা ফি", icon: Banknote, tone: "amber" },
      { label: "চলমান আবেদন", helper: "সেবার অপেক্ষায়", icon: Clock3, tone: "red" },
    ],
    tasks: [
      { title: "সংশোধন অনুরোধ", description: "অপারেটরের পাঠানো অনুরোধ পর্যালোচনা", icon: ClipboardList },
      { title: "দৈনিক ক্যাশ ক্লোজিং", description: "ক্যাশ ও ডিজিটাল পেমেন্ট মিলিয়ে নিন", icon: Banknote },
      { title: "মাসিক সরকারি রিপোর্ট", description: "নির্ধারিত ফরম্যাটে রিপোর্ট প্রস্তুত করুন", icon: ReceiptText },
    ],
  },
  operator: {
    eyebrow: "আজকের কাজের সারাংশ",
    title: "অপারেটর ড্যাশবোর্ড",
    description: "দ্রুত আবেদন গ্রহণ, অগ্রগতি Update ও রশিদ প্রস্তুত করুন।",
    metrics: [
      { label: "আমার আবেদন", helper: "আজ গ্রহণ করা", icon: FilePlus2, tone: "green" },
      { label: "সম্পন্ন", helper: "আজকের সেবা", icon: FileCheck2, tone: "blue" },
      { label: "চলমান", helper: "পরবর্তী পদক্ষেপ বাকি", icon: Clock3, tone: "amber" },
      { label: "অফলাইন সারি", helper: "সিঙ্কের অপেক্ষায়", icon: Activity, tone: "red" },
    ],
    tasks: [
      { title: "নতুন আবেদন", description: "১৪টি অনুমোদিত সেবা থেকে আবেদন শুরু করুন", icon: FilePlus2 },
      { title: "চলমান ফাইল", description: "অপেক্ষমাণ আবেদনের পরবর্তী পদক্ষেপ নিন", icon: Clock3 },
      { title: "রশিদ প্রস্তুত", description: "গ্রাহকের QR-যুক্ত কপি প্রিন্ট করুন", icon: ReceiptText },
    ],
  },
};

const tones = {
  green: "bg-emerald-50 text-emerald-700",
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-rose-50 text-rose-700",
};

export function RoleDashboardOverview({ role }: { role: UserRole }) {
  const current = content[role];
  const formattedDate = new Intl.DateTimeFormat("bn-BD", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold text-brand">{current.eyebrow}</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{current.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">{current.description}</p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-semibold text-muted shadow-sm">
          <CalendarDays className="size-4 text-brand" /> {formattedDate}
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {current.metrics.map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-border bg-white p-5 shadow-sm shadow-slate-200/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-muted">{metric.label}</p>
                <p className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">—</p>
              </div>
              <div className={`grid size-10 place-items-center rounded-xl ${tones[metric.tone]}`}>
                <metric.icon className="size-5" aria-hidden="true" />
              </div>
            </div>
            <p className="mt-4 border-t border-border pt-3 text-[10px] text-muted">{metric.helper}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <section className="rounded-2xl border border-border bg-white shadow-sm shadow-slate-200/30">
          <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-base font-extrabold">দ্রুত কার্যক্রম</h2>
              <p className="mt-1 text-[11px] text-muted">পরবর্তী মডিউলে সক্রিয় হবে</p>
            </div>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-[10px] font-bold text-brand">প্রথম ধাপ</span>
          </div>
          <div className="divide-y divide-border px-5 sm:px-6">
            {current.tasks.map((task) => (
              <div key={task.title} className="flex items-center gap-4 py-5">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1f6f4] text-brand">
                  <task.icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{task.title}</p>
                  <p className="mt-1 truncate text-xs text-muted">{task.description}</p>
                </div>
                <ArrowLeft className="size-4 shrink-0 text-slate-300" />
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm shadow-slate-200/30">
          <div className="bg-[#0d4637] px-5 py-5 text-white sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-white/10">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold">সিস্টেম প্রস্তুতি</h2>
                <p className="mt-0.5 text-[10px] text-white/55">নিরাপত্তা অগ্রাধিকার</p>
              </div>
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <ul className="space-y-4">
              {[
                ["Role-based route guard", true],
                ["কেন্দ্রভিত্তিক RLS", true],
                ["নিরাপদ session refresh", true],
                ["Live ডেটাবেজ সংযোগ", false],
              ].map(([label, ready]) => (
                <li key={label as string} className="flex items-center gap-3 text-xs font-semibold">
                  {ready ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <CircleDashed className="size-4 shrink-0 text-amber-500" />
                  )}
                  <span className={ready ? "text-foreground" : "text-muted"}>{label as string}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl bg-amber-50 p-3.5 text-[11px] leading-5 text-amber-900">
              লাইভ তথ্য দেখাতে ডেটাবেজ project সংযোগ প্রয়োজন। কোনো নমুনা তথ্যকে বাস্তব তথ্য হিসেবে দেখানো হচ্ছে না।
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
