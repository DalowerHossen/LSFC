"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
export type RenewalReviewState={error?:string;success?:string};
export async function reviewRenewalAction(_s:RenewalReviewState,f:FormData):Promise<RenewalReviewState>{await requireRole(["super_admin"]);const p=z.object({requestId:z.uuid(),decision:z.enum(["approve","reject"]),note:z.string().trim().min(10).max(1000)}).safeParse({requestId:f.get("requestId"),decision:f.get("decision"),note:f.get("note")});if(!p.success)return{error:p.error.issues[0]?.message??"Review তথ্য যাচাই করুন"};const{error}=await(await createClient()).rpc("review_license_renewal",{p_request_id:p.data.requestId,p_approve:p.data.decision==="approve",p_review_note:p.data.note});if(error)return{error:"Renewal review সম্পন্ন করা যায়নি।"};revalidatePath("/superadmin/license-renewals");revalidatePath("/owner/compliance");return{success:`Request ${p.data.decision==="approve"?"approved":"rejected"} হয়েছে।`}}
