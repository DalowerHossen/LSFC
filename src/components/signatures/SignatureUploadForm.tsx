"use client";

import { useActionState, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  FileImage,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import {
  uploadSignatureAction,
  type SignatureUploadState,
} from "@/app/owner/signature/actions";

const initialState: SignatureUploadState = {};

export function SignatureUploadForm({
  configured,
  currentSignatureId,
}: {
  configured: boolean;
  currentSignatureId: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    uploadSignatureAction,
    initialState,
  );
  const [preview, setPreview] = useState<string | null>(null);

  function selectFile(file: File | undefined) {
    if (!file) {
      setPreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <form action={formAction} className="rounded-2xl border border-border bg-white shadow-sm">
        <div className="border-b border-border p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
              <FileImage className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold">স্বাক্ষরের ছবি নির্বাচন</h2>
              <p className="mt-1 text-[11px] text-muted">স্বচ্ছ background-এর PNG ব্যবহার করলে রশিদে ভালো দেখাবে</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {!configured && (
            <Message error text="Encrypted Google Drive storage কনফিগার করার পর upload সক্রিয় হবে।" />
          )}
          {state.error && <Message error text={state.error} />}
          {state.success && <Message text="নতুন স্বাক্ষর সক্রিয় হয়েছে। এটি পরবর্তী রশিদগুলোতে স্বয়ংক্রিয়ভাবে যুক্ত হবে।" />}

          <label className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand/25 bg-brand-soft/30 p-6 text-center transition hover:border-brand/50 hover:bg-brand-soft/60">
            {preview ? (
              <img src={preview} alt="নির্বাচিত স্বাক্ষরের preview" className="max-h-32 max-w-full object-contain" />
            ) : (
              <>
                <div className="grid size-12 place-items-center rounded-2xl bg-white text-brand shadow-sm"><CloudUpload className="size-6" /></div>
                <p className="mt-4 text-sm font-extrabold">PNG অথবা WebP নির্বাচন করুন</p>
                <p className="mt-2 text-[11px] text-muted">সর্বোচ্চ ৫১২ KB • শুধু স্বাক্ষরের পরিষ্কার ছবি</p>
              </>
            )}
            <input
              type="file"
              name="signature"
              accept="image/png,image/webp"
              required
              className="sr-only"
              onChange={(event) => selectFile(event.target.files?.[0])}
            />
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-border bg-[#f7faf8] p-4 text-xs leading-6 text-muted">
            <input type="checkbox" required className="mt-1 size-4 accent-brand" />
            আমি নিশ্চিত করছি এটি কেন্দ্র পরিচালকের অনুমোদিত ডিজিটাল স্বাক্ষর এবং রশিদে ব্যবহারের অনুমতি রয়েছে।
          </label>

          <button
            type="submit"
            disabled={pending || !configured || !preview}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-lg shadow-brand/15 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <><LoaderCircle className="size-4 animate-spin" /> Encrypt ও upload হচ্ছে…</>
            ) : (
              <><LockKeyhole className="size-4" /> Encrypt করে সক্রিয় করুন</>
            )}
          </button>
        </div>
      </form>

      <aside className="space-y-5 xl:sticky xl:top-[108px] xl:self-start">
        <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="text-sm font-extrabold">বর্তমান স্বাক্ষর</h2>
            <p className="mt-1 text-[10px] text-muted">শুধু authenticated কেন্দ্র ব্যবহারকারী দেখতে পারবেন</p>
          </div>
          <div className="grid min-h-40 place-items-center bg-[#f7faf8] p-6">
            {currentSignatureId ? (
              <img src={`/api/signatures/${currentSignatureId}`} alt="বর্তমান ডিজিটাল স্বাক্ষর" className="max-h-24 max-w-full object-contain" />
            ) : (
              <div className="text-center text-muted"><FileImage className="mx-auto size-8 opacity-40" /><p className="mt-3 text-xs font-semibold">কোনো স্বাক্ষর সক্রিয় নেই</p></div>
            )}
          </div>
        </section>

        <div className="rounded-2xl bg-[#0d4637] p-5 text-white">
          <ShieldCheck className="size-6 text-[#7fe0bd]" />
          <h3 className="mt-4 text-sm font-extrabold">নিরাপদ সংরক্ষণ</h3>
          <ul className="mt-3 space-y-2 text-[10px] leading-5 text-white/65">
            <li>• AES-256-GCM encryption</li>
            <li>• হ্যাশ-ভিত্তিক encrypted filename</li>
            <li>• ব্যক্তিগত গুগল ড্রাইভ ফাইল</li>
            <li>• পুরোনো সংস্করণ কখনো delete হয় না</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function Message({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <div role={error ? "alert" : "status"} className={`flex gap-3 rounded-xl border p-4 text-xs leading-5 ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
      {error ? <AlertCircle className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0" />}
      {text}
    </div>
  );
}
