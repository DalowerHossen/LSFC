"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, LoaderCircle, Printer, QrCode, ReceiptText } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { archiveReceiptPdfAction,registerReceiptPrintAction, type ReceiptArchiveState,type ReceiptPrintState } from "@/app/operator/print-receipt/[id]/actions";
import type { ReceiptFormat, ReceiptRecord } from "@/types/receipt";

const money = new Intl.NumberFormat("bn-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 2,
});

const dateTime = new Intl.DateTimeFormat("bn-BD", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const formats: { value: ReceiptFormat; label: string; description: string }[] = [
  { value: "58mm", label: "58mm", description: "ছোট থার্মাল" },
  { value: "80mm", label: "80mm", description: "স্ট্যান্ডার্ড থার্মাল" },
  { value: "a4-half", label: "Half A4", description: "অর্ধেক A4" },
];

const statusLabels = {
  draft: "খসড়া",
  submitted: "আবেদন গৃহীত",
  in_progress: "সেবা চলমান",
  completed: "সেবা সম্পন্ন",
  cancelled_by_approval: "অনুমোদিত বাতিল",
};

export function CustomerReceipt({
  receipt,
  verificationUrl,
  previousPrints,
  settings,
}: {
  receipt: ReceiptRecord;
  verificationUrl: string;
  previousPrints: number;
  settings: { defaultFormat: ReceiptFormat; headerText: string | null; footerMessage: string | null; showCenterPhone: boolean; logoId: string | null };
}) {
  const [format, setFormat] = useState<ReceiptFormat>(settings.defaultFormat);
  const initialPrintState: ReceiptPrintState = {};
  const [printState, printAction, printঅপেক্ষমাণ] = useActionState(registerReceiptPrintAction, initialPrintState);
  const [archiveState,archiveAction,archivePending]=useActionState(archiveReceiptPdfAction,{} as ReceiptArchiveState);

  useEffect(() => {
    if (printState.print) window.print();
  }, [printState]);

  const issuedCopies = Math.max(previousPrints, printState.print?.copyNumber ?? 0);
  const nextCopy = issuedCopies + 1;
  const nextCopyFee = nextCopy === 1 ? 0 : 20;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_310px]">
      <div className="flex min-h-[680px] items-start justify-center overflow-auto rounded-2xl border border-border bg-[#e9eeeb] p-4 sm:p-8 print:min-h-0 print:overflow-visible print:border-0 print:bg-white print:p-0">
        <article className={`receipt-paper receipt-${format} bg-white text-black shadow-2xl print:shadow-none`}>
          <header className="border-b-2 border-black pb-3 text-center">
            {settings.logoId?<img src={`/api/center-assets/${settings.logoId}`} alt="কেন্দ্রের লোগো" className="mx-auto mb-2 max-h-14 max-w-24 object-contain"/>:<div className="mx-auto mb-2 grid size-10 place-items-center rounded-full bg-[#006a4e] text-sm font-extrabold text-white print:border print:border-black print:bg-white print:text-black">ভূ</div>}
            <h1 className="text-base font-extrabold leading-tight">{receipt.centerName}</h1>
            {settings.headerText && <p className="mt-1 text-[9px] font-bold">{settings.headerText}</p>}
            <p className="mt-1 text-[10px] leading-4">{receipt.centerAddress}</p>
            {settings.showCenterPhone && <p className="text-[10px]">Phone: {receipt.centerPhone}</p>}
            <div className="mt-2 inline-flex rounded-full border border-black px-3 py-1 text-[9px] font-extrabold">
              গ্রাহক কপি{receipt.version > 1 ? ` • সংশোধিত V${receipt.version}` : ""}
            </div>
          </header>

          <section className="border-b border-dashed border-black py-3 text-[10px] leading-5">
            <ReceiptLine label="রশিদ নম্বর" value={receipt.receiptNumber} mono />
            <ReceiptLine label="ইস্যুর সময়" value={dateTime.format(new Date(receipt.issuedAt))} />
            <ReceiptLine label="আবেদনের অবস্থা" value={statusLabels[receipt.applicationStatus]} />
          </section>

          <section className="border-b border-dashed border-black py-3 text-[10px] leading-5">
            <ReceiptLine label="নাগরিকের নাম" value={receipt.citizenName} />
            <ReceiptLine label="মোবাইল" value={receipt.citizenMobile} mono />
            <div className="mt-2 rounded border border-black p-2">
              <p className="text-[8px] font-bold uppercase tracking-wide">সেবার বিবরণ</p>
              <p className="mt-1 text-[11px] font-extrabold leading-5">{receipt.serviceName}</p>
            </div>
          </section>

          <section className="border-b-2 border-black py-3 text-[10px] leading-5">
            <ReceiptLine label="সরকারি ফি" value={money.format(receipt.governmentFee)} />
            <ReceiptLine label="সহায়তা ফি" value={money.format(receipt.assistanceFee)} />
            {receipt.additionalFee > 0 && <ReceiptLine label="অতিরিক্ত পৃষ্ঠা" value={money.format(receipt.additionalFee)} />}
            <div className="mt-2 flex items-end justify-between border-t border-black pt-2 text-sm font-extrabold">
              <span>মূল সেবা লেনদেনের মোট</span>
              <span>{money.format(receipt.totalFee)}</span>
            </div>
            {(printState.print?.fee ?? 0) > 0 && (
              <div className="mt-2 flex items-end justify-between rounded border border-black p-2 text-xs font-extrabold">
                <span>এই পুনর্মুদ্রণ কপির ফি</span>
                <span>{money.format(printState.print?.fee ?? 0)}</span>
              </div>
            )}
          </section>

          <footer className="pt-4 text-center">
            {receipt.signatureId && (
              <div className="mb-4 ml-auto w-28 border-b border-black pb-1 text-center">
                <img
                  src={`/api/signatures/${receipt.signatureId}`}
                  alt="কেন্দ্র পরিচালকের ডিজিটাল স্বাক্ষর"
                  className="mx-auto max-h-12 max-w-24 object-contain"
                />
                <p className="mt-1 text-[7px] font-bold">কেন্দ্র পরিচালকের স্বাক্ষর</p>
              </div>
            )}
            <QRCodeSVG value={verificationUrl} size={format === "58mm" ? 86 : 104} level="M" marginSize={1} title="রশিদ যাচাই QR কোড" />
            <p className="mt-2 text-[9px] font-bold">কিউআর কোড স্ক্যান করে রশিদ যাচাই করুন</p>
            <p className="mt-1 break-all font-mono text-[7px] leading-3">{verificationUrl}</p>
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[8px] font-bold">
              <Check className="size-3" /> সিস্টেম-জেনারেটেড অপরিবর্তনীয় রশিদ
            </div>
            <p className="mt-2 text-[8px] leading-4">{settings.footerMessage ?? "অফিস কপি ডিজিটালভাবে সংরক্ষিত • কাগজ সাশ্রয় করুন"}</p>
          </footer>
        </article>
      </div>

      <aside className="space-y-5 print:hidden xl:sticky xl:top-[108px] xl:self-start">
        <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-border p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><ReceiptText className="size-5" /></div>
            <div><h2 className="text-sm font-extrabold">রশিদ ফরম্যাট</h2><p className="mt-1 text-[10px] text-muted">প্রিন্টার অনুযায়ী নির্বাচন করুন</p></div>
          </div>
          <div className="space-y-2 p-4">
            {formats.map((item) => (
              <button key={item.value} type="button" onClick={() => setFormat(item.value)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${format === item.value ? "border-brand bg-brand-soft" : "border-border hover:border-brand/30"}`}>
                <span><span className="block text-xs font-extrabold">{item.label}</span><span className="mt-1 block text-[9px] text-muted">{item.description}</span></span>
                <span className={`grid size-5 place-items-center rounded-full border ${format === item.value ? "border-brand bg-brand text-white" : "border-border"}`}>{format === item.value && <Check className="size-3" />}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-border p-4">
            <form action={printAction}>
              <input type="hidden" name="receiptId" value={receipt.id} />
              <p className="mb-3 text-[10px] leading-5 text-muted">
                {nextCopy === 1 ? "প্রথম কপি বিনামূল্যে।" : `এটি ${nextCopy} নম্বর কপি; পুনর্মুদ্রণ ফি ${money.format(nextCopyFee)}।`}
              </p>
              <button disabled={printঅপেক্ষমাণ} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white shadow-lg shadow-brand/15 hover:bg-brand-dark disabled:opacity-60">
                {printঅপেক্ষমাণ ? <LoaderCircle className="size-4 animate-spin" /> : <Printer className="size-4" />} কপি নিবন্ধন ও প্রিন্ট
              </button>
              {printState.error && <p className="mt-2 text-[10px] font-semibold text-red-700">{printState.error}</p>}
              {printState.print && <p className="mt-2 text-[10px] font-semibold text-emerald-700">কপি {printState.print.copyNumber} নিবন্ধিত হয়েছে{printState.print.fee > 0 ? ` • আদায়যোগ্য ${money.format(printState.print.fee)}` : ""}।</p>}
            </form>
          </div>
        </section>

        <form action={archiveAction} className="rounded-xl border border-border bg-white p-4"><input type="hidden" name="receiptId" value={receipt.id}/><p className="text-xs font-extrabold">Final PDF archive</p><p className="mt-1 text-[9px] leading-4 text-muted">Print → Save as PDF করার পর এনক্রিপ্টেড archive-এ জমা দিন।</p><input name="pdf" type="file" accept="application/pdf" required className="mt-3 w-full rounded-lg border border-border p-2 text-[9px]"/><button disabled={archivePending} className="mt-2 h-9 w-full rounded-lg bg-brand text-[10px] font-bold text-white">{archivePending?"সংরক্ষণ হচ্ছে…":"PDF archive করুন"}</button>{(archiveState.error||archiveState.success)&&<p className={`mt-2 text-[9px] ${archiveState.error?"text-red-700":"text-emerald-700"}`}>{archiveState.error??archiveState.success}</p>}</form>
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-[10px] leading-5 text-blue-900">
          <QrCode className="mt-0.5 size-4 shrink-0" /> কিউআর Codeে কোনো ব্যক্তিগত তথ্য নেই। এটি শুধু একটি ২৫৬-বিট যাচাই টোকেন বহন করে।
        </div>
      </aside>
    </div>
  );
}

function ReceiptLine({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="flex items-start justify-between gap-3"><span>{label}</span><strong className={`max-w-[64%] text-right ${mono ? "font-mono" : ""}`}>{value}</strong></div>;
}
