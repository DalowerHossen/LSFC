import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { OwnerInvitationRevokeForm } from "@/components/auth/InvitationRevokeForm";
import { OwnerInviteForm } from "@/components/centers/OwnerInviteForm";
import { requireRole } from "@/lib/auth/session";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "কেন্দ্র পরিচালক নিয়োগ" };

export default async function CenterOwnerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["super_admin"]);
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: center }, { data: owner }, {data:invitation}] = await Promise.all([
    supabase.from("centers").select("id, code, name, status").eq("id", id).single(),
    supabase.from("profiles").select("id, full_name, email, phone, is_active, created_at").eq("center_id", id).eq("role", "owner").maybeSingle(),
    supabase.from("account_invitations").select("id,expires_at").eq("center_id",id).eq("invitation_role","owner").eq("status","pending").maybeSingle(),
  ]);
  if (!center) notFound();
  const configured = Boolean(isSupabaseAdminConfigured() && process.env.NEXT_PUBLIC_SITE_URL);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/superadmin/tenants" className="mb-5 flex w-fit items-center gap-2 text-xs font-bold text-muted hover:text-brand"><ArrowRight className="size-4" /> কেন্দ্র তালিকায় ফিরুন</Link>
      <div className="mb-7"><div className="flex items-center gap-2 text-xs font-bold text-brand"><Building2 className="size-4" /> {center.code}</div><h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">কেন্দ্র পরিচালক নিয়োগ</h1><p className="mt-2 text-sm text-muted">{center.name} • অবস্থা: <strong>{String(center.status).toUpperCase()}</strong></p></div>

      {owner ? (
        <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
          <div className="bg-emerald-50 p-6 text-center"><CheckCircle2 className="mx-auto size-12 text-emerald-600" /><h2 className="mt-3 text-lg font-extrabold text-emerald-950">কেন্দ্র পরিচালক ইতোমধ্যে নিয়োগ করা আছে</h2><p className="mt-1 text-xs text-emerald-800/70">পরিচালক নিয়োগের ইতিহাস মুছে ফেলা যাবে না</p></div>
          <div className="space-y-3 p-6"><Info icon={UserRound} label="পূর্ণ নাম" value={owner.full_name} /><Info icon={Mail} label="ইমেইল" value={owner.email ?? "—"} /><Info icon={Phone} label="মোবাইল" value={owner.phone ?? "—"} /><div className="flex items-center gap-2 rounded-xl bg-[#f7faf8] p-4 text-xs font-bold text-muted"><ShieldCheck className="size-4 text-brand" /> অ্যাকাউন্ট: {owner.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"} • TOTP বাধ্যতামূলক</div>{invitation&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold text-amber-900">আমন্ত্রণ গ্রহণের অপেক্ষায় • মেয়াদ {new Intl.DateTimeFormat("bn-BD",{dateStyle:"medium",timeZone:"Asia/Dhaka"}).format(new Date(invitation.expires_at))}</p><OwnerInvitationRevokeForm id={invitation.id}/></div>}</div>
        </section>
      ) : center.status === "blocked" ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">অবরুদ্ধ কেন্দ্রে কেন্দ্র পরিচালক assign করা যাবে না। আগে কেন্দ্রটি পুনরায় সক্রিয় করুন।</div>
      ) : (
        <OwnerInviteForm centerId={center.id} configured={configured} />
      )}
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-border p-4"><div className="grid size-9 place-items-center rounded-lg bg-brand-soft text-brand"><Icon className="size-4" /></div><div><p className="text-[10px] text-muted">{label}</p><p className="mt-1 text-xs font-bold">{value}</p></div></div>;
}
