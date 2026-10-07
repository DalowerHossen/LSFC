"use client";

import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { GovernmentMark } from "./GovernmentMark";

const navigation = [
  { label: "সেবা ও ফি", href: "/services" },
  { label: "সাধারণ জিজ্ঞাসা", href: "/info/faq" },
  { label: "ব্যবহার নির্দেশিকা", href: "/info/user-guide" },
  { label: "নীতিমালা", href: "/info/policies" },
  { label: "কেন্দ্র নিবন্ধন", href: "/register-center" },
];

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="হোম পেজ">
          <GovernmentMark compact />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="প্রধান নেভিগেশন">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-muted transition-colors hover:text-brand"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-brand"
          >
            কেন্দ্র লগইন
          </Link>
          <Link
            href="/track"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
          >
            আবেদন ট্র্যাক করুন
            <ArrowRight className="size-4 rotate-180" aria-hidden="true" />
          </Link>
        </div>

        <button
          type="button"
          className="grid size-10 place-items-center rounded-lg border border-border bg-white text-brand sm:hidden"
          aria-label={menuOpen ? "মেনু বন্ধ করুন" : "মেনু খুলুন"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {menuOpen && (
        <nav
          className="border-t border-border bg-white px-5 py-4 sm:hidden"
          aria-label="মোবাইল নেভিগেশন"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-semibold text-muted hover:bg-brand-soft hover:text-brand"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl border border-brand/20 px-4 py-3 text-center text-sm font-semibold text-brand"
              >
                কেন্দ্র লগইন
              </Link>
              <Link
                href="/track"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl bg-brand px-4 py-3 text-center text-sm font-semibold text-white"
              >
                ট্র্যাক করুন
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
