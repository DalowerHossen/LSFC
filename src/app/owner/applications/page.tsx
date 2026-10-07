import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Filter } from "lucide-react";
import { OwnerApplicationTable } from "@/components/applications/OwnerApplicationTable";
import { listApplications } from "@/lib/applications/list";
import { requireRole } from "@/lib/auth/session";
import type { ApplicationStatus } from "@/types/application";

export const metadata: Metadata = {
  title: "কেন্দ্রের আবেদনসমূহ",
  description: "নিজ কেন্দ্রের সকল ভূমিসেবা আবেদন পর্যবেক্ষণ করুন",
};

const filters: {
  value: string;
  label: string;
  statuses: ApplicationStatus[];
}[] = [
  { value: "all", label: "সব", statuses: ["draft", "submitted", "in_progress", "completed", "cancelled_by_approval"] },
  { value: "active", label: "চলমান", statuses: ["submitted", "in_progress"] },
  { value: "completed", label: "সম্পন্ন", statuses: ["completed"] },
  { value: "cancelled", label: "বাতিল", statuses: ["cancelled_by_approval"] },
];

export default async function OwnerApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole(["owner"]);
  const query = await searchParams;
  const selected = filters.find((item) => item.value === query.status) ?? filters[0];
  const applications = await listApplications(selected.statuses);

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand"><ClipboardList className="size-4" /> কেন্দ্র পর্যবেক্ষণ</div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">আবেদনসমূহ</h1>
          <p className="mt-2 text-sm leading-7 text-muted">নিজ কেন্দ্রের সর্বশেষ ১০০টি আবেদন ও আর্থিক তথ্য দেখুন।</p>
        </div>
        <span className="w-fit rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-bold text-muted">মোট {new Intl.NumberFormat("bn-BD").format(applications.length)}টি</span>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 flex items-center gap-1.5 text-[10px] font-bold text-muted"><Filter className="size-3.5" /> Filter</span>
        {filters.map((filter) => (
          <Link key={filter.value} href={filter.value === "all" ? "/owner/applications" : `/owner/applications?status=${filter.value}`} className={`rounded-lg px-3.5 py-2 text-[10px] font-bold transition ${selected.value === filter.value ? "bg-brand text-white" : "border border-border bg-white text-muted hover:border-brand/30 hover:text-brand"}`}>{filter.label}</Link>
        ))}
      </div>

      <OwnerApplicationTable applications={applications} />
    </div>
  );
}
