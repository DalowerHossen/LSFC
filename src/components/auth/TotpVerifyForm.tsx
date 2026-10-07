"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, ArrowLeft, KeyRound, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function TotpVerifyForm({ homePath }: { homePath: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setঅপেক্ষমাণ] = useState(false);

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!/^\d{6}$/.test(code)) {
      setError("৬ সংখ্যার যাচাই কোড লিখুন।");
      return;
    }

    setঅপেক্ষমাণ(true);
    setError(null);

    const supabase = createClient();
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp.find(
      (item: { id: string; status: string }) => item.status === "verified",
    );

    if (factorsError || !factor) {
      router.replace("/2fa-setup");
      router.refresh();
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code,
    });

    if (verifyError) {
      setError("কোডটি সঠিক নয় বা মেয়াদ শেষ হয়েছে। নতুন কোড দিয়ে চেষ্টা করুন।");
      setঅপেক্ষমাণ(false);
      setCode("");
      return;
    }

    router.replace(homePath);
    router.refresh();
  }

  return (
    <form onSubmit={verify} className="mt-8">
      {error && (
        <div role="alert" className="mb-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs leading-5 text-red-800">
          <AlertCircle className="size-4 shrink-0" /> {error}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-[#f7faf8] p-5">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
            <KeyRound className="size-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold">Authenticator Code</p>
            <p className="mt-1 text-[11px] text-muted">অ্যাপে বর্তমানে দেখানো Codeটি লিখুন</p>
          </div>
        </div>
        <input
          id="totp-code"
          aria-label="৬ সংখ্যার Authenticator কোড"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          placeholder="০০০০০০"
          className="mt-5 h-16 w-full rounded-xl border border-border bg-white px-4 text-center font-mono text-3xl font-extrabold tracking-[0.5em] outline-none focus:border-brand focus:ring-3 focus:ring-brand/10"
        />
      </div>

      <button
        type="submit"
        disabled={pending || code.length !== 6}
        className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-lg shadow-brand/15 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <><LoaderCircle className="size-4 animate-spin" /> যাচাই হচ্ছে…</>
        ) : (
          <>যাচাই করে প্রবেশ করুন <ArrowLeft className="size-4" /></>
        )}
      </button>

      <p className="mt-5 text-center text-[11px] leading-5 text-muted">
        টিওটিপি পাওয়া না গেলে ভবিষ্যতে WhatsApp এবং SMS fallback ব্যবহার করা যাবে।
      </p>
    </form>
  );
}
