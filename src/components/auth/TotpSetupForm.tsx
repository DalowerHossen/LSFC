"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  LoaderCircle,
  QrCode,
  Smartphone,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

export function TotpSetupForm({ homePath }: { homePath: string }) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setঅপেক্ষমাণ] = useState(false);
  const [copied, setCopied] = useState(false);

  async function startEnrollment() {
    setঅপেক্ষমাণ(true);
    setError(null);

    const supabase = createClient();
    const { data: factorData } = await supabase.auth.mfa.listFactors();

    // Remove abandoned, unverified enrollments before creating a fresh secret.
    for (const factor of factorData?.totp ?? []) {
      if (factor.status === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "LSFC Authenticator",
    });

    if (enrollError || !data || data.type !== "totp") {
      setError("Authenticator সেটআপ শুরু করা যায়নি। আবার চেষ্টা করুন।");
      setঅপেক্ষমাণ(false);
      return;
    }

    setEnrollment({
      factorId: data.id,
      qrCode: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data.totp.qr_code)}`,
      secret: data.totp.secret,
    });
    setঅপেক্ষমাণ(false);
  }

  async function verifyEnrollment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!enrollment || !/^\d{6}$/.test(code)) {
      setError("Authenticator অ্যাপের ৬ সংখ্যার কোড লিখুন।");
      return;
    }

    setঅপেক্ষমাণ(true);
    setError(null);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code,
    });

    if (verifyError) {
      setError("কোডটি সঠিক নয় বা মেয়াদ শেষ হয়েছে। নতুন কোড দিয়ে চেষ্টা করুন।");
      setঅপেক্ষমাণ(false);
      return;
    }

    router.replace(homePath);
    router.refresh();
  }

  async function copySecret() {
    if (!enrollment) return;
    await navigator.clipboard.writeText(enrollment.secret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (!enrollment) {
    return (
      <div className="mt-8">
        {error && <ErrorMessage message={error} />}
        <div className="rounded-2xl border border-border bg-[#f7faf8] p-5">
          <h2 className="text-sm font-extrabold">যা প্রয়োজন</h2>
          <ol className="mt-4 space-y-3 text-xs leading-6 text-muted">
            <li className="flex gap-3"><Step number="১" /> Google Authenticator, Microsoft Authenticator বা সমমানের অ্যাপ ইনস্টল করুন।</li>
            <li className="flex gap-3"><Step number="২" /> নিচের বোতাম চাপলে পাওয়া কিউআর কোডটি অ্যাপে স্ক্যান করুন।</li>
            <li className="flex gap-3"><Step number="৩" /> অ্যাপে দেখানো ৬ সংখ্যার Code দিয়ে সেটআপ নিশ্চিত করুন।</li>
          </ol>
        </div>
        <button
          type="button"
          onClick={startEnrollment}
          disabled={pending}
          className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-lg shadow-brand/15 transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <QrCode className="size-4" />}
          QR Code তৈরি করুন
          {!pending && <ArrowLeft className="size-4" />}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={verifyEnrollment} className="mt-7">
      {error && <ErrorMessage message={error} />}
      <div className="grid gap-5 rounded-2xl border border-border bg-[#f7faf8] p-5 sm:grid-cols-[164px_1fr]">
        <div className="rounded-xl border border-border bg-white p-2 shadow-sm">
          {/* Supabase returns this SVG from the authenticated enrollment endpoint. */}
          <img src={enrollment.qrCode} alt="Authenticator সেটআপ QR কোড" className="aspect-square w-full" />
        </div>
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 text-sm font-extrabold">
            <Smartphone className="size-4 text-brand" /> কিউআর কোড স্ক্যান করুন
          </div>
          <p className="mt-2 text-xs leading-6 text-muted">স্ক্যান করা সম্ভব না হলে নিচের গোপন key অ্যাপে লিখুন। এটি কারও সঙ্গে শেয়ার করবেন না।</p>
          <button
            type="button"
            onClick={copySecret}
            className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-left font-mono text-[10px] font-bold text-foreground"
          >
            <span className="min-w-0 flex-1 truncate">{enrollment.secret}</span>
            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5 text-muted" />}
          </button>
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="totp-code" className="mb-2 block text-sm font-bold">৬ সংখ্যার যাচাই Code</label>
        <input
          id="totp-code"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          placeholder="০০০০০০"
          className="h-14 w-full rounded-xl border border-border bg-white px-4 text-center font-mono text-2xl font-extrabold tracking-[0.45em] outline-none focus:border-brand focus:ring-3 focus:ring-brand/10"
        />
      </div>

      <button
        type="submit"
        disabled={pending || code.length !== 6}
        className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-lg shadow-brand/15 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? <><LoaderCircle className="size-4 animate-spin" /> যাচাই হচ্ছে…</> : <><Check className="size-4" /> সেটআপ নিশ্চিত করুন</>}
      </button>
    </form>
  );
}

function Step({ number }: { number: string }) {
  return <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[10px] font-extrabold text-brand">{number}</span>;
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div role="alert" className="mb-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs leading-5 text-red-800">
      <AlertCircle className="size-4 shrink-0" /> {message}
    </div>
  );
}
