"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle, ArrowLeft, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm({ configured }: { configured: boolean }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {!configured && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>ডেমো মোড চলছে। ডেটাবেজ সংযোগের পর লগইন সক্রিয় হবে।</p>
        </div>
      )}

      {state.error && (
        <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
          <p>{state.error}</p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-bold text-foreground">
          ইমেইল ঠিকানা
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="name@example.com"
            className="h-13 w-full rounded-xl border border-border bg-white pr-4 pl-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-3 focus:ring-brand/10"
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-4">
          <label htmlFor="password" className="text-sm font-bold text-foreground">
            পাসওয়ার্ড
          </label>
          <Link href="/forgot-password" className="text-xs font-semibold text-brand hover:underline">পাসওয়ার্ড ভুলে গেছেন?</Link>
        </div>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            minLength={8}
            required
            placeholder="আপনার পাসওয়ার্ড"
            className="h-13 w-full rounded-xl border border-border bg-white pr-12 pl-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-3 focus:ring-brand/10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-brand-soft hover:text-brand"
            aria-label={showPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-lg shadow-brand/15 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-65"
      >
        {pending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" /> যাচাই হচ্ছে…
          </>
        ) : (
          <>
            নিরাপদ লগইন <ArrowLeft className="size-4" />
          </>
        )}
      </button>
    </form>
  );
}
