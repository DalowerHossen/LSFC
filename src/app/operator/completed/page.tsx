import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { ApplicationList } from "@/components/applications/ApplicationList";
import { requireRole } from "@/lib/auth/session";
import { listApplications } from "@/lib/applications/list";

export const metadata: Metadata = {
  title: "সম্পন্ন আবেদন",
  description: "সম্পন্ন ভূমিসেবা আবেদন ও রশিদের তালিকা",
};

export default async function CompletedApplicationsPage() {
  await requireRole(["operator"]);
  const applications = await listApplications(["completed"]);

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand"><CheckCircle2 className="size-4" /> সেবা সম্পন্ন</div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">সম্পন্ন আবেদন</h1>
          <p className="mt-2 text-sm leading-7 text-muted">সম্পন্ন সেবার তথ্য ও গ্রাহকের রশিদ নম্বর এক জায়গায় দেখুন।</p>
        </div>
        <span className="w-fit rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-bold text-muted">মোট {new Intl.NumberFormat("bn-BD").format(applications.length)}টি</span>
      </div>

      <ApplicationList applications={applications} mode="completed" />
    </div>
  );
}
