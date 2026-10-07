import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Ban,
  Building2,
  Clock3,
  CreditCard,
  LogOut,
  PauseCircle,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { GovernmentMark } from "@/components/common/GovernmentMark";
import { getAuthContext } from "@/lib/auth/session";
import { ROLE_HOME } from "@/types/auth";
import type { CenterStatus } from "@/types/center";

export const metadata: Metadata = { title: "কেন্দ্রের অবস্থা" };

const content: Record<Exclude<CenterStatus, "active">, { title: string; description: string; icon: typeof Clock3; tone: string }> = {
  pending: { title: "কেন্দ্র অনুমোদনের অপেক্ষায়", description: "সুপার অ্যাডমিন কেন্দ্রের তথ্য ও কেন্দ্র পরিচালক onboarding যাচাই করছেন। অনুমোদন হলে ড্যাশবোর্ড স্বয়ংক্রিয়ভাবে চালু হবে।", icon: Clock3, tone: "bg-amber-50 text-amber-700" },
  suspended: { title: "কেন্দ্রটি সাময়িকভাবে স্থগিত", description: "এই কেন্দ্রের operational access সাময়িকভাবে বন্ধ আছে। বিস্তারিত জানতে platform administration-এর সঙ্গে যোগাযোগ করুন।", icon: PauseCircle, tone: "bg-blue-50 text-blue-700" },
  blocked: { title: "কেন্দ্রের access বন্ধ", description: "প্রশাসনিক সিদ্ধান্তে কেন্দ্রটি blocked রয়েছে। পুনরায় সক্রিয় না হওয়া পর্যন্ত কোনো operational data ব্যবহার করা যাবে না।", icon: Ban, tone: "bg-red-50 text-red-700" },
};

export default async function CenterStatusPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  if (context.role === "super_admin" || context.centerStatus === "active") {
    redirect(ROLE_HOME[context.role]);
  }

  const status = context.centerStatus ?? "pending";
  const current = content[status];
  const Icon = current.icon;

  return (
    <main className="min-h-screen bg-[#f3f7f5] px-5 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-xl">
        <GovernmentMark compact />
        <section className="mt-12 rounded-3xl border border-border bg-white p-7 text-center shadow-xl shadow-brand/5 sm:p-10">
          <div className={`mx-auto grid size-16 place-items-center rounded-2xl ${current.tone}`}><Icon className="size-8" /></div>
          <p className="mt-6 text-xs font-bold text-brand">{context.centerName}</p>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{current.title}</h1>
          <p className="mt-4 text-sm leading-8 text-muted">{current.description}</p>
          <div className="mt-7 flex items-center justify-center gap-2 rounded-xl bg-[#f7faf8] p-4 text-xs font-semibold text-muted"><Building2 className="size-4 text-brand" /> বর্তমান অবস্থা: <strong className="text-foreground">{status.toUpperCase()}</strong></div>
          {context.role === "owner" && <Link href="/owner/subscription" className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-xs font-bold text-white"><CreditCard className="size-4" /> সাবস্ক্রিপশন ও পরিশোধ দেখুন</Link>}
          <form action={logoutAction} className="mt-5"><button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-xs font-bold text-muted hover:border-brand/30 hover:text-brand"><LogOut className="size-4" /> নিরাপদে লগআউট</button></form>
        </section>
      </div>
    </main>
  );
}
