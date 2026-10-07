"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
export type ServiceToggleState={error?:string;success?:string};
const schema=z.object({serviceCode:z.string().min(2).max(80),targetState:z.enum(["true","false"]),reason:z.string().trim().min(10,"কারণ কমপক্ষে ১০ অক্ষরের হতে হবে").max(500)});
export async function setServiceAvailabilityAction(_state:ServiceToggleState,formData:FormData):Promise<ServiceToggleState>{await requireRole(["super_admin"]);const parsed=schema.safeParse({serviceCode:formData.get("serviceCode"),targetState:formData.get("targetState"),reason:formData.get("reason")});if(!parsed.success)return{error:parsed.error.issues[0]?.message??"তথ্য যাচাই করুন"};const enabled=parsed.data.targetState==="true";const{error}=await(await createClient()).rpc("set_service_availability",{p_service_code:parsed.data.serviceCode,p_is_active:enabled,p_reason:parsed.data.reason});if(error)return{error:error.message.includes("already")?"Service ইতোমধ্যে এই অবস্থায় আছে।":"Service status পরিবর্তন করা যায়নি।"};revalidatePath("/superadmin/services");revalidatePath("/superadmin/fees");revalidatePath("/operator/new-application");return{success:`Service globally ${enabled?"ON":"OFF"} করা হয়েছে।`}}
