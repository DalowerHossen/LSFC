"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type BillingState = { error?: string; success?: string };
const reason = z.string().trim().min(10, "কারণ কমপক্ষে ১০ অক্ষরের হতে হবে").max(500);
const fee = z.coerce.number().min(0).max(10_000_000);
const cycle = z.enum(["monthly", "yearly"]);
const paymentMethod = z.enum(["cash", "bank_transfer", "mobile_financial_service", "other"]);
function refresh(){ revalidatePath("/superadmin/subscriptions"); revalidatePath("/superadmin/tenants"); }

export async function updatePricingAction(_state: BillingState, formData: FormData): Promise<BillingState> {
  await requireRole(["super_admin"]);
  const parsed=z.object({monthlyFee:fee,yearlyFee:fee,graceDays:z.coerce.number().int().min(0).max(90),reason}).safeParse({monthlyFee:formData.get("monthlyFee"),yearlyFee:formData.get("yearlyFee"),graceDays:formData.get("graceDays"),reason:formData.get("reason")});
  if(!parsed.success)return{error:parsed.error.issues[0]?.message??"মূল্য যাচাই করুন"};
  const {error}=await (await createClient()).rpc("update_subscription_pricing",{p_monthly_fee:parsed.data.monthlyFee,p_yearly_fee:parsed.data.yearlyFee,p_grace_days:parsed.data.graceDays,p_reason:parsed.data.reason});
  if(error)return{error:error.message.includes("unchanged")?"Pricing-এ কোনো পরিবর্তন নেই।":"Pricing আপডেট করা যায়নি।"}; refresh(); return{success:"Subscription pricing আপডেট ও audit করা হয়েছে।"};
}

export async function assignSubscriptionAction(_state: BillingState, formData: FormData): Promise<BillingState> {
  await requireRole(["super_admin"]);
  const parsed=z.object({centerId:z.uuid(),billingCycle:cycle,startDate:z.iso.date(),reason}).safeParse({centerId:formData.get("centerId"),billingCycle:formData.get("billingCycle"),startDate:formData.get("startDate"),reason:formData.get("reason")});
  if(!parsed.success)return{error:parsed.error.issues[0]?.message??"Subscription তথ্য যাচাই করুন"};
  const {error}=await (await createClient()).rpc("assign_center_subscription",{p_center_id:parsed.data.centerId,p_billing_cycle:parsed.data.billingCycle,p_start_date:parsed.data.startDate,p_reason:parsed.data.reason});
  if(error)return{error:error.message.includes("already")?"এই কেন্দ্রের subscription ইতোমধ্যে তৈরি হয়েছে।":"Subscription assign করা যায়নি।"}; refresh(); return{success:"Subscription তৈরি হয়েছে; payment এখন record করুন।"};
}

export async function recordPaymentAction(_state: BillingState, formData: FormData): Promise<BillingState> {
  await requireRole(["super_admin"]);
  const parsed=z.object({subscriptionId:z.uuid(),paymentMethod,paymentReference:z.string().trim().min(3).max(120)}).safeParse({subscriptionId:formData.get("subscriptionId"),paymentMethod:formData.get("paymentMethod"),paymentReference:formData.get("paymentReference")});
  if(!parsed.success)return{error:parsed.error.issues[0]?.message??"Payment তথ্য যাচাই করুন"};
  const {data,error}=await (await createClient()).rpc("record_subscription_payment",{p_subscription_id:parsed.data.subscriptionId,p_payment_method:parsed.data.paymentMethod,p_payment_reference:parsed.data.paymentReference});
  if(error)return{error:error.message.includes("duplicate")?"এই payment reference আগে ব্যবহৃত হয়েছে।":"Payment record করা যায়নি।"}; refresh(); return{success:`Payment সংরক্ষিত। Voucher: ${String(data)}`};
}

export async function enforceOverdueAction(_state: BillingState): Promise<BillingState> {
  void _state;
  await requireRole(["super_admin"]); const {data,error}=await (await createClient()).rpc("enforce_overdue_subscriptions");
  if(error)return{error:"Overdue policy চালানো যায়নি।"}; refresh(); return{success:`Overdue policy সম্পন্ন: ${Number(data??0)}টি subscription suspended হয়েছে।`};
}
