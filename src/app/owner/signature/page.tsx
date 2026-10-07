import type { Metadata } from "next";
import { PenLine, ShieldCheck } from "lucide-react";
import { SignatureUploadForm } from "@/components/signatures/SignatureUploadForm";
import { requireRole } from "@/lib/auth/session";
import { isSignatureStorageConfigured } from "@/lib/google-drive/signature-storage";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "ডিজিটাল স্বাক্ষর",
  description: "রশিদের জন্য কেন্দ্র পরিচালকের encrypted ডিজিটাল স্বাক্ষর পরিচালনা করুন",
};

export default async function OwnerSignaturePage() {
  const context = await requireRole(["owner"]);
  const supabase = await createClient();
  const { data: signature } = await supabase
    .from("center_signatures")
    .select("id")
    .eq("center_id", context.centerId!)
    .eq("is_active", true)
    .maybeSingle();

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand"><PenLine className="size-4" /> কেন্দ্র পরিচালকের সেটিং</div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">ডিজিটাল স্বাক্ষর</h1>
          <p className="mt-2 text-sm leading-7 text-muted">একবার সক্রিয় করলে পরবর্তী নতুন রশিদে স্বাক্ষরটির সেই সংস্করণ স্বয়ংক্রিয়ভাবে যুক্ত হবে।</p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800"><ShieldCheck className="size-4" /> Versioned ও audit-logged</div>
      </div>

      <SignatureUploadForm
        configured={isSignatureStorageConfigured()}
        currentSignatureId={signature?.id ?? null}
      />
    </div>
  );
}
