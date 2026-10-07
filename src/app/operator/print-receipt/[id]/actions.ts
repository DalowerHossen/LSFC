"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { deleteEncryptedDriveFile,isEncryptedFileStorageConfigured,uploadEncryptedPdfArchive } from "@/lib/google-drive/encrypted-file-storage";
import { createClient } from "@/lib/supabase/server";

export type ReceiptPrintState = {
  error?: string;
  print?: { copyNumber: number; fee: number };
};

const schema = z.object({ receiptId: z.uuid() });

export async function registerReceiptPrintAction(
  _state: ReceiptPrintState,
  formData: FormData,
): Promise<ReceiptPrintState> {
  await requireRole(["operator"]);
  const parsed = schema.safeParse({ receiptId: formData.get("receiptId") });
  if (!parsed.success) return { error: "রশিদের তথ্য সঠিক নয়" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_receipt_print", {
    p_receipt_id: parsed.data.receiptId,
  });
  const row = (Array.isArray(data) ? data[0] : data) as
    | { copy_number: number; copy_fee: number | string }
    | null;
  if (error || !row) return { error: "কপি নিবন্ধন করা যায়নি। আবার চেষ্টা করুন।" };
  return { print: { copyNumber: row.copy_number, fee: Number(row.copy_fee) } };
}
export type ReceiptArchiveState={error?:string;success?:string};
export async function archiveReceiptPdfAction(_s:ReceiptArchiveState,f:FormData):Promise<ReceiptArchiveState>{const context=await requireRole(["operator"]);const id=z.uuid().safeParse(f.get("receiptId"));const file=f.get("pdf");if(!id.success||!(file instanceof File)||file.size<1||file.size>10*1024*1024||file.type!=="application/pdf")return{error:"সর্বোচ্চ ১০ মেগাবাইটের বৈধ PDF দিন।"};if(!isEncryptedFileStorageConfigured())return{error:"এনক্রিপ্টেড Drive কনফিগার করা হয়নি।"};const bytes=Buffer.from(await file.arrayBuffer());if(bytes.subarray(0,5).toString("ascii")!=="%PDF-")return{error:"ফাইলটি প্রকৃত PDF নয়।"};const supabase=await createClient();const{data:receipt}=await supabase.from("receipts").select("id,issued_at,centers!inner(code)").eq("id",id.data).eq("center_id",context.centerId!).single();const center=receipt?.centers as unknown as{code?:string}|null;if(!receipt||!center?.code)return{error:"রশিদটি পাওয়া যায়নি।"};const hash=createHash("sha256").update(bytes).digest("hex"),encryptedName=`enc_${hash.slice(0,24)}.bin`;try{const uploaded=await uploadEncryptedPdfArchive({bytes,encryptedName,centerCode:center.code,entityType:"receipt",entityId:receipt.id,createdAt:new Date(receipt.issued_at)});const{error}=await supabase.rpc("register_archived_pdf",{p_entity_type:"receipt",p_entity_id:receipt.id,p_drive_file_id:uploaded.fileId,p_encrypted_file_name:encryptedName,p_file_hash:hash,p_plain_size:bytes.length,p_encrypted_size:uploaded.encryptedSize,p_drive_path_key:uploaded.pathKey});if(error){try{await deleteEncryptedDriveFile(uploaded.fileId)}catch{const{error:queueError}=await supabase.rpc("queue_drive_cleanup",{p_center_id:context.centerId!,p_drive_file_id:uploaded.fileId,p_drive_path_key:uploaded.pathKey,p_source_type:"pdf_archive",p_reason:"PDF metadata registration and compensating Drive deletion failed"});return queueError?{error:"PDF নিবন্ধন, rollback ও reconciliation queue—সব ব্যর্থ হয়েছে; জরুরি প্রশাসনিক সহায়তা নিন।"}:{error:"PDF নিবন্ধন ও rollback ব্যর্থ হয়েছে; অবশিষ্ট ফাইল reconciliation সারিতে রাখা হয়েছে।"}}return{error:"PDF নিবন্ধন করা যায়নি; অস্থায়ী ফাইল সরানো হয়েছে।"}}}catch{return{error:"PDF এনক্রিপ্ট করে সংরক্ষণ করা যায়নি।"}}revalidatePath(`/operator/print-receipt/${receipt.id}`);return{success:"রশিদের PDF এনক্রিপ্ট করে archive করা হয়েছে।"}}
