import type { Metadata } from "next";
import Link from "next/link";
import {
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  UserCheck,
  UserRound,
  UserX,
  Users,
} from "lucide-react";
import { setStaffAccessAction, setStaffPermissionsAction } from "./actions";
import { StaffInvitationRevokeForm } from "@/components/auth/InvitationRevokeForm";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "কর্মচারী ব্যবস্থাপনা",
  description: "কেন্দ্রের কর্মচারী account ও access পরিচালনা করুন",
};

type StaffRow = {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  staff_code: string | null;
  designation: string | null;
  joined_on: string | null;
  is_active: boolean;
  permissions: { can_create_application: boolean; can_update_status: boolean; can_print_receipt: boolean; can_request_correction: boolean };
};

export default async function StaffPage() {
  const context = await requireRole(["owner"]);
  const supabase = await createClient();
  const [{ data }, { data: permissionRows }, { data: invitationRows }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, phone, staff_code, designation, joined_on, is_active").eq("center_id", context.centerId!).eq("role", "operator").order("created_at", { ascending: false }),
    supabase.from("operator_permissions").select("profile_id,can_create_application,can_update_status,can_print_receipt,can_request_correction").eq("center_id", context.centerId!),
    supabase.from("account_invitations").select("id,invitee_profile_id,expires_at").eq("center_id",context.centerId!).eq("status","pending").eq("invitation_role","operator"),
  ]);
  const invitationMap=new Map((invitationRows??[]).map(row=>[row.invitee_profile_id,row]));
  const permissionMap = new Map((permissionRows ?? []).map((row) => [row.profile_id, row]));
  const staff = (data ?? []).map((row) => ({ ...row, permissions: permissionMap.get(row.id) ?? { can_create_application: true, can_update_status: true, can_print_receipt: true, can_request_correction: true } })) as StaffRow[];

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand"><Users className="size-4" /> কেন্দ্র পরিচালনা</div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">কর্মচারী ব্যবস্থাপনা</h1>
          <p className="mt-2 text-sm leading-7 text-muted">অপারেটর অ্যাকাউন্ট আমন্ত্রণ, পর্যবেক্ষণ এবং প্রবেশাধিকার নিয়ন্ত্রণ করুন।</p>
        </div>
        <Link href="/owner/staff/new" className="flex h-11 w-fit items-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white"><Plus className="size-4" /> নতুন কর্মচারী</Link>
      </div>

      <div className="mb-5 flex w-fit items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-bold text-muted">
        <ShieldCheck className="size-4 text-brand" /> মোট {new Intl.NumberFormat("bn-BD").format(staff.length)} জন
      </div>

      {staff.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand"><Users className="size-6" /></div>
          <h2 className="mt-4 text-base font-extrabold">কোনো কর্মচারী যুক্ত নেই</h2>
          <p className="mt-2 text-xs text-muted">প্রথম অপারেটরকে নিরাপদ আমন্ত্রণ পাঠান।</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {staff.map((member) => (
            <article key={member.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><UserRound className="size-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/owner/staff/${member.id}`} className="text-sm font-extrabold hover:text-brand hover:underline">{member.full_name}</Link>
                    <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${member.is_active ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{member.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{member.designation ?? "কম্পিউটার অপারেটর"} • <span className="font-mono">{member.staff_code ?? "আইডি অপেক্ষমাণ"}</span></p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Info icon={Mail} text={member.email ?? "ইমেইল পাওয়া যায়নি"} />
                <Info icon={Phone} text={member.phone ?? "মোবাইল পাওয়া যায়নি"} mono />
              </div>
              {invitationMap.get(member.id)&&<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="text-[10px] font-bold text-amber-900">আমন্ত্রণ গ্রহণের অপেক্ষায় • মেয়াদ {new Intl.DateTimeFormat("bn-BD",{dateStyle:"medium",timeZone:"Asia/Dhaka"}).format(new Date(invitationMap.get(member.id)!.expires_at))}</p><StaffInvitationRevokeForm id={invitationMap.get(member.id)!.id}/></div>}
              <form action={setStaffPermissionsAction} className="mt-4 rounded-xl border border-border bg-[#f7faf8] p-3">
                <input type="hidden" name="profileId" value={member.id} />
                <p className="text-[10px] font-extrabold text-brand">কাজের অনুমতি</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-semibold">
                  <label className="flex items-center gap-2"><input name="createApplication" type="checkbox" defaultChecked={member.permissions.can_create_application} className="accent-brand" /> নতুন আবেদন</label>
                  <label className="flex items-center gap-2"><input name="updateStatus" type="checkbox" defaultChecked={member.permissions.can_update_status} className="accent-brand" /> অবস্থা পরিবর্তন</label>
                  <label className="flex items-center gap-2"><input name="printReceipt" type="checkbox" defaultChecked={member.permissions.can_print_receipt} className="accent-brand" /> রশিদ প্রিন্ট</label>
                  <label className="flex items-center gap-2"><input name="requestCorrection" type="checkbox" defaultChecked={member.permissions.can_request_correction} className="accent-brand" /> সংশোধন অনুরোধ</label>
                </div>
                <button className="mt-3 h-8 rounded-lg bg-brand px-3 text-[10px] font-bold text-white">অনুমতি সংরক্ষণ</button>
              </form>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <p className="text-[10px] text-muted">যোগদান: {member.joined_on ? new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "short", year: "numeric" }).format(new Date(member.joined_on)) : "—"}</p>
                <form action={setStaffAccessAction}>
                  <input type="hidden" name="profileId" value={member.id} />
                  <input type="hidden" name="isActive" value={member.is_active ? "false" : "true"} />
                  <button type="submit" className={`flex h-9 items-center gap-2 rounded-lg px-3 text-[10px] font-bold ${member.is_active ? "border border-red-200 text-red-700 hover:bg-red-50" : "bg-brand text-white"}`}>
                    {member.is_active ? <><UserX className="size-3.5" /> প্রবেশাধিকার বন্ধ করুন</> : <><UserCheck className="size-3.5" /> প্রবেশাধিকার চালু করুন</>}
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Info({ icon: Icon, text, mono = false }: { icon: typeof Mail; text: string; mono?: boolean }) {
  return <div className="flex items-center gap-2 rounded-lg bg-[#f7faf8] px-3 py-2.5 text-[10px] text-muted"><Icon className="size-3.5 shrink-0 text-brand" /><span className={`truncate ${mono ? "font-mono" : ""}`}>{text}</span></div>;
}
