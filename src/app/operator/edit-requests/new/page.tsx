import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileEdit } from "lucide-react";
import { CorrectionRequestForm } from "@/components/corrections/CorrectionRequestForm";
import { listApplications } from "@/lib/applications/list";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "নতুন সংশোধন অনুরোধ" };

export default async function NewCorrectionRequestPage({ searchParams }: { searchParams: Promise<{ application?: string }> }) {
  await requireRole(["operator"]);
  const query = await searchParams;
  const applications = await listApplications(["submitted", "in_progress", "completed"]);
  const options = applications.map((item) => ({ id: item.id, trackingId: item.trackingId, serviceName: item.serviceName }));
  const selectedId = options.some((item) => item.id === query.application) ? query.application : undefined;

  return <div className="mx-auto max-w-3xl"><Link href="/operator/edit-requests" className="mb-5 flex w-fit items-center gap-2 text-xs font-bold text-muted hover:text-brand"><ArrowRight className="size-4" /> অনুরোধ তালিকায় ফিরুন</Link><div className="mb-7"><div className="flex items-center gap-2 text-xs font-bold text-brand"><FileEdit className="size-4" /> সরাসরি কোনো পরিবর্তন নয়</div><h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">নতুন সংশোধন অনুরোধ</h1><p className="mt-2 text-sm leading-7 text-muted">ভুল তথ্য, সঠিক প্রস্তাব এবং কারণ লিখে কেন্দ্র পরিচালকের অনুমোদনের জন্য পাঠান।</p></div><CorrectionRequestForm applications={options} selectedApplicationId={selectedId} /></div>;
}
