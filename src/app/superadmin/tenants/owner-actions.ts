"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type OwnerInviteState = {
  error?: string;
  success?: string;
};
export type OwnerInvitationActionState=OwnerInviteState;

const schema = z.object({
  centerId: z.uuid(),
  fullName: z.string().trim().min(2).max(120),
  email: z.email("সঠিক ইমেইল লিখুন"),
  phone: z.string().regex(/^01[3-9][0-9]{8}$/, "সঠিক মোবাইল নম্বর লিখুন"),
});

export async function inviteCenterOwnerAction(
  _previousState: OwnerInviteState,
  formData: FormData,
): Promise<OwnerInviteState> {
  await requireRole(["super_admin"]);
  const parsed = schema.safeParse({
    centerId: formData.get("centerId"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Owner-এর তথ্য যাচাই করুন" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!isSupabaseAdminConfigured() || !siteUrl) {
    return { error: "Supabase Admin এবং public site URL এখনো কনফিগার করা হয়নি।" };
  }

  const supabase = await createClient();
  const { data: center } = await supabase
    .from("centers")
    .select("id, status")
    .eq("id", parsed.data.centerId)
    .single();
  if (!center || center.status === "blocked") {
    return { error: "এই কেন্দ্রে Owner assignment করা যাবে না।" };
  }

  const admin = createAdminClient();
  const { data, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email.toLowerCase(),
    {
      redirectTo: `${siteUrl}/auth/callback?next=/set-password`,
      data: { full_name: parsed.data.fullName, phone: parsed.data.phone },
    },
  );
  if (inviteError || !data.user) {
    return { error: "Owner invitation পাঠানো যায়নি। ইমেইলটি আগে ব্যবহৃত হয়েছে কি না যাচাই করুন।" };
  }

  const { error: assignError } = await supabase.rpc(
    "assign_invited_center_owner",
    {
      p_user_id: data.user.id,
      p_center_id: parsed.data.centerId,
      p_full_name: parsed.data.fullName,
      p_phone: parsed.data.phone,
    },
  );
  if (assignError) {
    await admin.auth.admin.updateUserById(data.user.id,{ban_duration:"876000h"});
    return { error: "Invitation তৈরি হয়েছে, কিন্তু Owner হিসেবে assign করা যায়নি; অ্যাকাউন্টটি নিরাপত্তার জন্য নিষ্ক্রিয় করা হয়েছে।" };
  }
  const{error:trackingError}=await supabase.rpc("register_account_invitation",{p_profile_id:data.user.id,p_center_id:parsed.data.centerId,p_role:"owner",p_email:parsed.data.email.toLowerCase()});
  if(trackingError){await admin.auth.admin.updateUserById(data.user.id,{ban_duration:"876000h"});return{error:"Invitation lifecycle নিবন্ধন ব্যর্থ হয়েছে; অ্যাকাউন্টটি নিরাপত্তার জন্য নিষ্ক্রিয় করা হয়েছে।"}}

  revalidatePath("/superadmin/tenants");
  revalidatePath(`/superadmin/tenants/${parsed.data.centerId}/owner`);
  return { success: "Center Owner invitation পাঠানো এবং assignment সম্পন্ন হয়েছে।" };
}
export async function revokeOwnerInvitationAction(_state:OwnerInvitationActionState,formData:FormData):Promise<OwnerInvitationActionState>{await requireRole(["super_admin"]);const parsed=z.object({invitationId:z.uuid(),reason:z.string().trim().min(5).max(500)}).safeParse({invitationId:formData.get("invitationId"),reason:formData.get("reason")});if(!parsed.success)return{error:"প্রত্যাহারের কারণ কমপক্ষে ৫ অক্ষরে লিখুন।"};if(!isSupabaseAdminConfigured())return{error:"Supabase Admin কনফিগার করা হয়নি।"};const supabase=await createClient();const{data:item}=await supabase.from("account_invitations").select("id,invitee_profile_id,status,invitation_role,center_id").eq("id",parsed.data.invitationId).single();if(!item||item.status!=="pending"||item.invitation_role!=="owner")return{error:"অপেক্ষমাণ আমন্ত্রণটি পাওয়া যায়নি।"};const admin=createAdminClient();const{data:userData}=await admin.auth.admin.getUserById(item.invitee_profile_id);if(userData.user?.email_confirmed_at)return{error:"আমন্ত্রণটি ইতোমধ্যে গ্রহণ করা হয়েছে; Owner replacement workflow ব্যবহার করুন।"};const{data:profileId,error}=await supabase.rpc("revoke_account_invitation",{p_invitation_id:item.id,p_reason:parsed.data.reason});if(error||!profileId)return{error:"আমন্ত্রণ প্রত্যাহার করা যায়নি।"};const{error:banError}=await admin.auth.admin.updateUserById(String(profileId),{ban_duration:"876000h"});revalidatePath(`/superadmin/tenants/${item.center_id}/owner`);return banError?{error:"আমন্ত্রণ প্রত্যাহার হয়েছে, তবে Auth ban যাচাই প্রয়োজন।"}:{success:"কেন্দ্র পরিচালকের আমন্ত্রণ প্রত্যাহার করা হয়েছে।"}}
