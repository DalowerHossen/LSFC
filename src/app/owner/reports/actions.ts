"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
export type ReportState={error?:string};
export async function generateMonthlyReportAction(_state:ReportState,formData:FormData):Promise<ReportState>{await requireRole(["owner"]);const parsed=z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).safeParse(formData.get("reportMonth"));if(!parsed.success)return{error:"সঠিক completed month নির্বাচন করুন।"};const reportMonth=`${parsed.data}-01`;const currentMonth=new Date().toISOString().slice(0,7);if(parsed.data>=currentMonth)return{error:"শুধু সম্পন্ন হওয়া মাসের report final করা যাবে।"};const{data,error}=await(await createClient()).rpc("generate_monthly_government_report",{p_report_month:reportMonth});if(error)return{error:error.message.includes("already")?"এই মাসের report ইতোমধ্যে তৈরি হয়েছে।":error.message.includes("cash-closed")?"Report তৈরির আগে মাসের প্রতিটি activity day cash close করুন।":"Monthly report তৈরি করা যায়নি।"};redirect(`/owner/reports/${String(data)}`)}
