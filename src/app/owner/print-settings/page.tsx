import type { Metadata } from "next";
import { Printer } from "lucide-react";
import { CenterLogoForm,PrintSettingsForm } from "@/components/receipts/PrintSettingsForm";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ReceiptFormat } from "@/types/receipt";
export const metadata:Metadata={title:"রশিদ প্রিন্ট সেটিংস"};
export default async function PrintSettingsPage(){const context=await requireRole(["owner"]);const supabase=await createClient();const[{data},{data:logo}]=await Promise.all([supabase.from("center_receipt_settings").select("default_format,header_text,footer_message,show_center_phone").eq("center_id",context.centerId!).maybeSingle(),supabase.from("center_brand_assets").select("id").eq("center_id",context.centerId!).eq("asset_type","logo").order("created_at",{ascending:false}).limit(1).maybeSingle()]);return <div><div className="mb-7"><div className="flex items-center gap-2 text-xs font-bold text-brand"><Printer className="size-4"/> গ্রাহক কপি</div><h1 className="mt-2 text-2xl font-extrabold">রশিদ প্রিন্ট সেটিংস</h1><p className="mt-2 text-sm leading-7 text-muted">কাগজের মাপ, নিরাপদ লেখা ও এনক্রিপ্টেড কেন্দ্র লোগো নির্ধারণ করুন।</p></div><PrintSettingsForm settings={{defaultFormat:(data?.default_format as ReceiptFormat|undefined)??"80mm",headerText:data?.header_text??"",footerMessage:data?.footer_message??"",showCenterPhone:data?.show_center_phone??true}}/><CenterLogoForm logoId={logo?.id??null}/></div>}
