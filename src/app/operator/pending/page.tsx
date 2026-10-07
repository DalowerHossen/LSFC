import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileClock, Plus } from "lucide-react";
import { ApplicationList } from "@/components/applications/ApplicationList";
import { requireRole } from "@/lib/auth/session";
import { listApplications } from "@/lib/applications/list";

export const metadata: Metadata = {
  title: "চলমান আবেদন",
  description: "অপেক্ষমাণ ও চলমান ভূমিসেবা আবেদন পরিচালনা করুন",
};

export default async function অপেক্ষমাণApplicationsPage() {
  await requireRole(["operator"]);
  const applications = await listApplications(["submitted", "in_progress"]);

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand"><FileClock className="size-4" /> আবেদন কার্যক্রম</div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">চলমান আবেদন</h1>
          <p className="mt-2 text-sm leading-7 text-muted">অপেক্ষমাণ আবেদন শুরু করুন এবং কাজ শেষ হলে সম্পন্ন হিসেবে চিহ্নিত করুন।</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-bold text-muted">মোট {new Intl.NumberFormat("bn-BD").format(applications.length)}টি</span>
          <Link href="/operator/new-application" className="flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-xs font-bold text-white"><Plus className="size-4" /> নতুন আবেদন <ArrowLeft className="size-3.5" /></Link>
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[11px] leading-5 text-blue-900">
        অবস্থা পরিবর্তনের অনুমোদিত ধাপ: <strong>অপেক্ষমাণ → চলমান → সম্পন্ন</strong>। সম্পন্ন আবেদন সরাসরি পরিবর্তন বা মুছে ফেলা যাবে না।
      </div>

      <ApplicationList applications={applications} mode="pending" />
    </div>
  );
}
