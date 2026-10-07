import { KeyRound, LockKeyhole, ShieldCheck, Smartphone } from "lucide-react";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";
import { GovernmentMark } from "@/components/common/GovernmentMark";

export function MfaPageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.02fr_.98fr]">
      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex items-center justify-between">
          <GovernmentMark compact />
          <form action={logoutAction}>
            <button type="submit" className="text-xs font-bold text-muted hover:text-brand">
              অন্য অ্যাকাউন্ট ব্যবহার করুন
            </button>
          </form>
        </div>

        <div className="mx-auto my-auto w-full max-w-[470px] py-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3.5 py-2 text-xs font-bold text-brand">
            <ShieldCheck className="size-4" /> {eyebrow}
          </div>
          <h1 className="mt-5 text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm leading-7 text-muted">{description}</p>
          {children}
        </div>
      </section>

      <section className="relative hidden overflow-hidden bg-[#092f24] p-14 text-white lg:flex lg:flex-col lg:justify-center xl:p-20">
        <div className="absolute -top-24 -right-24 size-80 rounded-full bg-[#178c6b]/40 blur-3xl" />
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-15" />
        <div className="relative max-w-lg">
          <div className="grid size-14 place-items-center rounded-2xl border border-white/15 bg-white/10">
            <LockKeyhole className="size-7 text-[#7fe0bd]" />
          </div>
          <h2 className="mt-7 text-3xl leading-tight font-extrabold xl:text-4xl">
            পাসওয়ার্ডের পরেও
            <span className="block text-[#7fe0bd]">আরও একটি সুরক্ষা স্তর</span>
          </h2>
          <p className="mt-5 text-sm leading-8 text-white/60">
            Authenticator অ্যাপের Code আপনার অ্যাকাউন্টকে পাসওয়ার্ড চুরি ও অননুমোদিত প্রবেশ থেকে সুরক্ষিত রাখে।
          </p>
          <div className="mt-9 grid gap-3">
            {[
              [Smartphone, "ইন্টারনেট ছাড়াই কোড তৈরি হয়"],
              [KeyRound, "প্রতি ৩০ সেকেন্ডে নতুন কোড"],
              [ShieldCheck, "সুপার অ্যাডমিন ও কেন্দ্র পরিচালক-এর জন্য বাধ্যতামূলক"],
            ].map(([Icon, label]) => {
              const ItemIcon = Icon as typeof Smartphone;
              return (
                <div key={label as string} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm font-semibold text-white/75">
                  <ItemIcon className="size-5 shrink-0 text-[#7fe0bd]" />
                  {label as string}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
