import type { Metadata } from "next";
import Link from "next/link";
import { FileEdit, Plus } from "lucide-react";
import { CorrectionRequestList } from "@/components/corrections/CorrectionRequestList";
import { requireRole } from "@/lib/auth/session";
import { listCorrectionRequests } from "@/lib/corrections/list";

export const metadata: Metadata = { title: "সংশোধন অনুরোধ" };

export default async function OperatorEditRequestsPage() {
  const context = await requireRole(["operator"]);
  const requests = await listCorrectionRequests(context.userId);
  return <div><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2 text-xs font-bold text-brand"><FileEdit className="size-4" /> অনুমোদনভিত্তিক সংশোধন</div><h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">আমার সংশোধন অনুরোধ</h1><p className="mt-2 text-sm text-muted">মূল তথ্য পরিবর্তন না করে অনুমোদনের অগ্রগতি দেখুন।</p></div><Link href="/operator/edit-requests/new" className="flex h-11 w-fit items-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white"><Plus className="size-4" /> নতুন অনুরোধ</Link></div><CorrectionRequestList requests={requests} /></div>;
}
