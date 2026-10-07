"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { deleteEncryptedDriveFile,isEncryptedFileStorageConfigured,uploadEncryptedCenterAsset } from "@/lib/google-drive/encrypted-file-storage";
import { createClient } from "@/lib/supabase/server";

export type PrintSettingsState = { error?: string; success?: string };
const schema = z.object({
  defaultFormat: z.enum(["58mm", "80mm", "a4-half"]),
  headerText: z.string().trim().max(120).optional(), footerMessage: z.string().trim().max(300).optional(),
  showCenterPhone: z.boolean(),
}).refine((value) => !value.headerText || value.headerText.length >= 2, { message: "শিরোনাম কমপক্ষে ২ অক্ষরের হতে হবে" })
  .refine((value) => !value.footerMessage || value.footerMessage.length >= 2, { message: "বার্তা কমপক্ষে ২ অক্ষরের হতে হবে" });

export async function savePrintSettingsAction(_state: PrintSettingsState, formData: FormData): Promise<PrintSettingsState> {
  await requireRole(["owner"]);
  const parsed = schema.safeParse({ defaultFormat: formData.get("defaultFormat"), headerText: String(formData.get("headerText") ?? "") || undefined, footerMessage: String(formData.get("footerMessage") ?? "") || undefined, showCenterPhone: formData.get("showCenterPhone") === "on" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "প্রিন্ট সেটিংস যাচাই করুন" };
  const { error } = await (await createClient()).rpc("save_receipt_settings", { p_default_format: parsed.data.defaultFormat, p_header_text: parsed.data.headerText ?? null, p_footer_message: parsed.data.footerMessage ?? null, p_show_center_phone: parsed.data.showCenterPhone });
  if (error) return { error: "প্রিন্ট সেটিংস সংরক্ষণ করা যায়নি।" };
  revalidatePath("/owner/print-settings"); revalidatePath("/operator/print-receipt/[id]", "page");
  return { success: "প্রিন্ট সেটিংস সংরক্ষিত হয়েছে।" };
}
function validLogo(bytes:Buffer,type:string){if(type==="image/png")return bytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));if(type==="image/jpeg")return bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;if(type==="image/webp")return bytes.subarray(0,4).toString("ascii")==="RIFF"&&bytes.subarray(8,12).toString("ascii")==="WEBP";return false}
export async function uploadCenterLogoAction(_state:PrintSettingsState,formData:FormData):Promise<PrintSettingsState>{const context=await requireRole(["owner"]);const file=formData.get("logo");if(!(file instanceof File)||file.size<1||file.size>2*1024*1024||!["image/png","image/jpeg","image/webp"].includes(file.type))return{error:"সর্বোচ্চ ২ মেগাবাইট PNG, JPEG অথবা WebP লোগো দিন।"};if(!isEncryptedFileStorageConfigured())return{error:"এনক্রিপ্টেড Google Drive সংরক্ষণ এখনো কনফিগার করা হয়নি।"};const bytes=Buffer.from(await file.arrayBuffer());if(!validLogo(bytes,file.type))return{error:"ফাইলের প্রকৃত ধরন সঠিক নয়।"};const supabase=await createClient();const{data:center}=await supabase.from("centers").select("code").eq("id",context.centerId!).single();if(!center?.code)return{error:"কেন্দ্রটি পাওয়া যায়নি।"};const hash=createHash("sha256").update(bytes).digest("hex");const encryptedName=`enc_${hash.slice(0,24)}.bin`;try{const uploaded=await uploadEncryptedCenterAsset({bytes,encryptedName,centerCode:center.code,assetType:"logo",createdAt:new Date()});const{error}=await supabase.rpc("register_center_logo",{p_drive_file_id:uploaded.fileId,p_encrypted_file_name:encryptedName,p_file_hash:hash,p_mime_type:file.type,p_plain_size:bytes.length,p_encrypted_size:uploaded.encryptedSize,p_drive_path_key:uploaded.pathKey});if(error){try{await deleteEncryptedDriveFile(uploaded.fileId)}catch{const{error:queueError}=await supabase.rpc("queue_drive_cleanup",{p_center_id:context.centerId!,p_drive_file_id:uploaded.fileId,p_drive_path_key:uploaded.pathKey,p_source_type:"center_logo",p_reason:"Metadata registration and compensating deletion failed"});return{error:queueError?"লোগো নিবন্ধন ও Drive rollback ব্যর্থ হয়েছে। জরুরি প্রশাসনিক সহায়তা নিন।":"অবশিষ্ট Drive ফাইল প্রশাসনিক পরিচ্ছন্নতা সারিতে যোগ হয়েছে।"}}return{error:"লোগো নিবন্ধন করা যায়নি; অস্থায়ী Drive ফাইল সরানো হয়েছে।"}}}catch{return{error:"লোগোটি এনক্রিপ্ট করে সংরক্ষণ করা যায়নি।"}}revalidatePath("/owner/print-settings");revalidatePath("/operator/print-receipt/[id]","page");return{success:"কেন্দ্রের লোগো এনক্রিপ্ট করে সংরক্ষণ করা হয়েছে।"}}
