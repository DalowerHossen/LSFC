import Link from "next/link";
import { ArrowRight, LockKeyhole, SearchCheck } from "lucide-react";
import { GovernmentMark } from "@/components/common/GovernmentMark";
import { TrackingForm } from "./TrackingForm";

export function TrackingPageView({ trackingId = "" }: { trackingId?: string }) {
  return (
    <main className="min-h-screen bg-[#f3f7f5] px-5 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/"><GovernmentMark compact /></Link>
          <Link href="/" className="flex items-center gap-2 text-xs font-bold text-muted hover:text-brand"><ArrowRight className="size-4" /> হোমে ফিরুন</Link>
        </div>

        <section className="mt-10 rounded-3xl border border-border bg-white p-6 shadow-xl shadow-brand/5 sm:p-9">
          <div className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand"><SearchCheck className="size-6" /></div>
          <p className="mt-6 text-xs font-bold text-brand">নাগরিক সেবা</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">আবেদনের অবস্থা জানুন</h1>
          <p className="mt-3 text-sm leading-7 text-muted">রশিদে থাকা ট্র্যাকিং আইডি এবং আবেদনে ব্যবহৃত মোবাইল নম্বর দিয়ে বর্তমান অগ্রগতি দেখুন।</p>
          <TrackingForm defaultTrackingId={trackingId} />
        </section>

        <p className="mt-5 flex items-center justify-center gap-2 text-center text-[10px] text-muted"><LockKeyhole className="size-3.5" /> আপনার ব্যক্তিগত তথ্য প্রকাশ করা হয় না</p>
      </div>
    </main>
  );
}
