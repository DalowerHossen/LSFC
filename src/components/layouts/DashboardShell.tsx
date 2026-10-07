"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  Boxes,
  Building2,
  ChartNoAxesCombined,
  ChevronDown,
  ClipboardList,
  FileCheck2,
  FileEdit,
  FileClock,
  FileKey2,
  FilePlus2,
  FileText,
  HandCoins,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Menu,
  PenLine,
  ReceiptText,
  ShieldCheck,
  ToggleLeft,
  Users,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";
import { GovernmentMark } from "@/components/common/GovernmentMark";
import type { AuthContext, UserRole } from "@/types/auth";

type NavItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
};

const roleLabels: Record<UserRole, string> = {
  super_admin: "সুপার অ্যাডমিন",
  owner: "কেন্দ্র পরিচালক",
  operator: "কম্পিউটার অপারেটর",
};

const navigation: Record<UserRole, NavItem[]> = {
  super_admin: [
    { label: "ড্যাশবোর্ড", href: "/superadmin/dashboard", icon: LayoutDashboard },
    { label: "কেন্দ্র ব্যবস্থাপনা", href: "/superadmin/tenants", icon: Building2 },
    { label: "নিবন্ধন আবেদন", href: "/superadmin/registration-requests", icon: ClipboardList },
    { label: "পুনরুদ্ধার পর্যালোচনা", href: "/superadmin/recovery-requests", icon: FileKey2 },
    { label: "সাবস্ক্রিপশন", href: "/superadmin/subscriptions", icon: WalletCards },
    { label: "ফি ব্যবস্থাপনা", href: "/superadmin/fees", icon: HandCoins },
    { label: "সেবা নিয়ন্ত্রণ", href: "/superadmin/services", icon: ToggleLeft },
    { label: "ইন্টিগ্রেশন", href: "/superadmin/integrations", icon: ShieldCheck },
    { label: "বার্তা delivery", href: "/superadmin/message-delivery", icon: Bell },
    { label: "নিরাপত্তা ও অডিট", href: "/superadmin/security", icon: FileKey2 },
    { label: "Drive পরিচ্ছন্নতা", href: "/superadmin/storage-cleanup", icon: HardDrive },
    { label: "লাইসেন্স নবায়ন", href: "/superadmin/license-renewals", icon: BadgeCheck },
    { label: "সংশোধন অনুমোদন", href: "/superadmin/edit-approvals", icon: FileCheck2 },
    { label: "জাতীয় বিশ্লেষণ", href: "/superadmin/analytics", icon: ChartNoAxesCombined },
    { label: "CMS ও নোটিশ", href: "/superadmin/content", icon: Bell },
  ],
  owner: [
    { label: "ড্যাশবোর্ড", href: "/owner/dashboard", icon: LayoutDashboard },
    { label: "আবেদনসমূহ", href: "/owner/applications", icon: ClipboardList },
    { label: "কর্মচারী", href: "/owner/staff", icon: Users },
    { label: "সাবস্ক্রিপশন", href: "/owner/subscription", icon: WalletCards },
    { label: "আয়-ব্যয়", href: "/owner/finance", icon: ChartNoAxesCombined },
    { label: "সরকারি রিপোর্ট", href: "/owner/reports", icon: FileText },
    { label: "প্রোফাইল ও কমপ্লায়েন্স", href: "/owner/compliance", icon: ShieldCheck },
    { label: "ইন্সপেকশন ও অভিযোগ", href: "/owner/operations", icon: Boxes },
    { label: "কার্যক্রম নিরীক্ষা", href: "/owner/audit-logs", icon: FileKey2 },
    { label: "বার্তা প্রদানের ইতিহাস", href: "/owner/message-delivery", icon: Bell },
    { label: "নোটিশ বোর্ড", href: "/owner/notices", icon: Bell },
    { label: "ডিজিটাল স্বাক্ষর", href: "/owner/signature", icon: PenLine },
    { label: "রশিদ প্রিন্ট সেটিংস", href: "/owner/print-settings", icon: ReceiptText },
    { label: "সংশোধন পর্যালোচনা", href: "/owner/edit-requests", icon: FileEdit },
  ],
  operator: [
    { label: "ড্যাশবোর্ড", href: "/operator/dashboard", icon: LayoutDashboard },
    { label: "নতুন আবেদন", href: "/operator/new-application", icon: FilePlus2 },
    { label: "চলমান আবেদন", href: "/operator/pending", icon: FileClock },
    { label: "সম্পন্ন আবেদন", href: "/operator/completed", icon: ClipboardList },
    { label: "রশিদ", href: "/operator/completed", icon: ReceiptText },
    { label: "সংশোধন অনুরোধ", href: "/operator/edit-requests", icon: FileEdit },
    { label: "নোটিশ বোর্ড", href: "/operator/notices", icon: Bell },
  ],
};

export function DashboardShell({
  context,
  children,
}: {
  context: AuthContext;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const sidebar = (
    <div className="flex h-full flex-col bg-[#092d23] text-white">
      <div className="flex h-[76px] items-center border-b border-white/10 px-5">
        <GovernmentMark compact inverse />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-6" aria-label="ড্যাশবোর্ড নেভিগেশন">
        <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.12em] text-white/35">
          প্রধান মেনু
        </p>
        <div className="space-y-1.5">
          {navigation[context.role].map((item) => {
            const Icon = item.icon;
            const active = item.href === pathname;
            const classes = `flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
              active
                ? "bg-white text-brand shadow-sm"
                : item.href
                  ? "text-white/65 hover:bg-white/8 hover:text-white"
                  : "cursor-not-allowed text-white/35"
            }`;

            if (!item.href) {
              return (
                <div key={item.label} className={classes} aria-disabled="true">
                  <Icon className="size-[18px]" aria-hidden="true" />
                  <span>{item.label}</span>
                  <span className="ml-auto rounded-full border border-white/10 px-2 py-0.5 text-[8px] font-bold">
                    শীঘ্রই
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={classes}
              >
                <Icon className="size-[18px]" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#d9f2e8] text-sm font-extrabold text-brand">
            {context.fullName.trim().charAt(0) || "ব্য"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">{context.fullName}</p>
            <p className="mt-0.5 truncate text-[10px] text-white/45">{roleLabels[context.role]}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-xs font-semibold text-white/55 transition hover:bg-red-500/10 hover:text-red-200"
          >
            <LogOut className="size-4" aria-hidden="true" /> নিরাপদে লগআউট
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f7f5]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[270px] lg:block">{sidebar}</aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="মেনু বন্ধ করুন"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative h-full w-[286px] max-w-[86vw] shadow-2xl">
            {sidebar}
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute top-5 -right-12 grid size-9 place-items-center rounded-full bg-white text-foreground shadow"
              aria-label="মেনু বন্ধ করুন"
            >
              <X className="size-5" />
            </button>
          </aside>
        </div>
      )}

      <div className="lg:pl-[270px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-border bg-white/92 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="grid size-10 place-items-center rounded-xl border border-border text-brand lg:hidden"
              aria-label="মেনু খুলুন"
            >
              <Menu className="size-5" />
            </button>
            <div>
              <p className="text-sm font-extrabold text-foreground sm:text-base">{roleLabels[context.role]} প্যানেল</p>
              <p className="mt-0.5 hidden text-[10px] text-muted sm:block">
                {context.centerName ?? "কেন্দ্রীয় প্ল্যাটফর্ম ব্যবস্থাপনা"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="relative grid size-10 place-items-center rounded-xl border border-border bg-white text-muted hover:text-brand"
              aria-label="নোটিফিকেশন"
            >
              <Bell className="size-[18px]" />
              <span className="absolute top-2.5 right-2.5 size-1.5 rounded-full bg-accent ring-2 ring-white" />
            </button>
            <button
              type="button"
              className="hidden items-center gap-3 rounded-xl border border-border bg-white py-1.5 pr-2 pl-1.5 sm:flex"
              aria-label="প্রোফাইল মেনু"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-xs font-extrabold text-brand">
                {context.fullName.trim().charAt(0) || "ব্য"}
              </span>
              <span className="max-w-32 truncate text-xs font-bold">{context.fullName}</span>
              <ChevronDown className="size-3.5 text-muted" />
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] p-4 sm:p-7 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
