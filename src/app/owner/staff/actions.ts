"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type StaffActionState = {
  error?: string;
  success?: string;
};
export type InvitationActionState=StaffActionState;

const inviteSchema = z.object({
  fullName: z.string().trim().min(2, "কর্মচারীর পূর্ণ নাম লিখুন").max(120),
  email: z.email("সঠিক ইমেইল ঠিকানা লিখুন"),
  phone: z.string().regex(/^01[3-9][0-9]{8}$/, "সঠিক মোবাইল নম্বর লিখুন"),
  designation: z.string().trim().min(2).max(80),
});

export async function inviteStaffAction(
  _previousState: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const context = await requireRole(["owner"]);

  const parsed = inviteSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    designation: formData.get("designation"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "তথ্য যাচাই করুন" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!isSupabaseAdminConfigured() || !siteUrl) {
    return { error: "Supabase Admin এবং public site URL এখনো কনফিগার করা হয়নি।" };
  }

  const admin = createAdminClient();
  const { data, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email.toLowerCase(),
    {
      redirectTo: `${siteUrl}/auth/callback?next=/set-password`,
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
      },
    },
  );

  if (inviteError || !data.user) {
    return { error: "Invitation পাঠানো যায়নি। ইমেইলটি আগে ব্যবহৃত হয়েছে কি না যাচাই করুন।" };
  }

  const supabase = await createClient();
  const { data: staffCode, error: assignmentError } = await supabase.rpc(
    "assign_invited_staff",
    {
      p_user_id: data.user.id,
      p_full_name: parsed.data.fullName,
      p_phone: parsed.data.phone,
      p_designation: parsed.data.designation,
    },
  );

  if (assignmentError) {
    await admin.auth.admin.updateUserById(data.user.id,{ban_duration:"876000h"});
    return { error: "Invitation তৈরি হয়েছে, কিন্তু কেন্দ্রের সঙ্গে যুক্ত করা যায়নি; অ্যাকাউন্টটি নিরাপত্তার জন্য নিষ্ক্রিয় করা হয়েছে।" };
  }
  const {error:trackingError}=await supabase.rpc("register_account_invitation",{p_profile_id:data.user.id,p_center_id:context.centerId!,p_role:"operator",p_email:parsed.data.email.toLowerCase()});
  if(trackingError){await supabase.rpc("set_staff_access",{p_profile_id:data.user.id,p_is_active:false});await admin.auth.admin.updateUserById(data.user.id,{ban_duration:"876000h"});return{error:"Invitation lifecycle নিবন্ধন ব্যর্থ হয়েছে; অ্যাকাউন্টটি নিরাপত্তার জন্য নিষ্ক্রিয় করা হয়েছে।"}}

  revalidatePath("/owner/staff");
  return { success: `Invitation পাঠানো হয়েছে। Staff ID: ${String(staffCode)}` };
}

export async function revokeStaffInvitationAction(_state:InvitationActionState,formData:FormData):Promise<InvitationActionState>{await requireRole(["owner"]);const parsed=z.object({invitationId:z.uuid(),reason:z.string().trim().min(5).max(500)}).safeParse({invitationId:formData.get("invitationId"),reason:formData.get("reason")});if(!parsed.success)return{error:"প্রত্যাহারের কারণ কমপক্ষে ৫ অক্ষরে লিখুন।"};if(!isSupabaseAdminConfigured())return{error:"Supabase Admin কনফিগার করা হয়নি।"};const supabase=await createClient();const{data:item}=await supabase.from("account_invitations").select("id,invitee_profile_id,status,invitation_role").eq("id",parsed.data.invitationId).single();if(!item||item.status!=="pending"||item.invitation_role!=="operator")return{error:"অপেক্ষমাণ আমন্ত্রণটি পাওয়া যায়নি।"};const admin=createAdminClient();const{data:userData}=await admin.auth.admin.getUserById(item.invitee_profile_id);if(userData.user?.email_confirmed_at)return{error:"আমন্ত্রণটি ইতোমধ্যে গ্রহণ করা হয়েছে; কর্মচারীর access control ব্যবহার করুন।"};const{data:profileId,error}=await supabase.rpc("revoke_account_invitation",{p_invitation_id:item.id,p_reason:parsed.data.reason});if(error||!profileId)return{error:"আমন্ত্রণ প্রত্যাহার করা যায়নি।"};const{error:banError}=await admin.auth.admin.updateUserById(String(profileId),{ban_duration:"876000h"});revalidatePath("/owner/staff");return banError?{error:"আমন্ত্রণ প্রত্যাহার হয়েছে, তবে Auth ban যাচাই করতে প্রশাসকের সহায়তা নিন।"}:{success:"কর্মচারীর আমন্ত্রণ প্রত্যাহার করা হয়েছে।"}}

const accessSchema = z.object({
  profileId: z.uuid(),
  isActive: z.enum(["true", "false"]),
});

const permissionSchema = z.object({
  profileId: z.uuid(),
  createApplication: z.boolean(), updateStatus: z.boolean(), printReceipt: z.boolean(), requestCorrection: z.boolean(),
});

export async function setStaffPermissionsAction(formData: FormData) {
  await requireRole(["owner"]);
  const parsed = permissionSchema.safeParse({
    profileId: formData.get("profileId"), createApplication: formData.get("createApplication") === "on",
    updateStatus: formData.get("updateStatus") === "on", printReceipt: formData.get("printReceipt") === "on",
    requestCorrection: formData.get("requestCorrection") === "on",
  });
  if (!parsed.success) return;
  await (await createClient()).rpc("set_operator_permissions", {
    p_profile_id: parsed.data.profileId, p_can_create_application: parsed.data.createApplication,
    p_can_update_status: parsed.data.updateStatus, p_can_print_receipt: parsed.data.printReceipt,
    p_can_request_correction: parsed.data.requestCorrection,
  });
  revalidatePath("/owner/staff");
}

export async function setStaffAccessAction(formData: FormData) {
  await requireRole(["owner"]);
  const parsed = accessSchema.safeParse({
    profileId: formData.get("profileId"),
    isActive: formData.get("isActive"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.rpc("set_staff_access", {
    p_profile_id: parsed.data.profileId,
    p_is_active: parsed.data.isActive === "true",
  });
  revalidatePath("/owner/staff");
}
