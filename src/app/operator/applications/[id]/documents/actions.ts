"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { deleteEncryptedDriveFile, isEncryptedFileStorageConfigured, uploadEncryptedApplicationFile } from "@/lib/google-drive/encrypted-file-storage";
import { createClient } from "@/lib/supabase/server";

export type DocumentUploadState = { error?: string; success?: string };
const MAX_BYTES = 10 * 1024 * 1024;
function validHeader(bytes: Buffer, type: string) {
  if (type === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (type === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/webp") return bytes.subarray(0,4).toString("ascii") === "RIFF" && bytes.subarray(8,12).toString("ascii") === "WEBP";
  return false;
}
export async function uploadApplicationDocumentAction(_state: DocumentUploadState, formData: FormData): Promise<DocumentUploadState> {
  const context = await requireRole(["operator"]);
  const parsed = z.object({ applicationId: z.uuid(), documentType: z.enum(["nid","khatian","map","application","supporting","other"]) }).safeParse({ applicationId: formData.get("applicationId"), documentType: formData.get("documentType") });
  if (!parsed.success) return { error: "নথির তথ্য সঠিক নয়" };
  const file = formData.get("document");
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_BYTES || !["application/pdf","image/png","image/jpeg","image/webp"].includes(file.type)) return { error: "সর্বোচ্চ ১০ মেগাবাইট PDF, PNG, JPEG অথবা WebP ফাইল দিন।" };
  if (!isEncryptedFileStorageConfigured()) return { error: "এনক্রিপ্টেড Google Drive সংরক্ষণ এখনো কনফিগার করা হয়নি।" };
  const bytes = Buffer.from(await file.arrayBuffer()); if (!validHeader(bytes, file.type)) return { error: "ফাইলের প্রকৃত ধরন সঠিক নয়।" };
  const supabase = await createClient();
  const { data: app } = await supabase.from("applications").select("id,center_id,service_code,created_at,centers!inner(code)").eq("id", parsed.data.applicationId).single();
  const center = app?.centers as unknown as { code?: string } | null; if (!app || !center?.code) return { error: "আবেদনটি পাওয়া যায়নি।" };
  const hash = createHash("sha256").update(bytes).digest("hex"); const encryptedName = `enc_${hash.slice(0,24)}.bin`;
  try {
    const uploaded = await uploadEncryptedApplicationFile({ bytes, encryptedName, centerCode: center.code, serviceCode: app.service_code, createdAt: new Date(app.created_at) });
    const { error } = await supabase.rpc("register_application_document", { p_application_id: app.id, p_document_type: parsed.data.documentType, p_drive_file_id: uploaded.fileId, p_encrypted_file_name: encryptedName, p_file_hash: hash, p_mime_type: file.type, p_plain_size: bytes.length, p_encrypted_size: uploaded.encryptedSize, p_drive_path_key: uploaded.pathKey });
    if (error) {
      try { await deleteEncryptedDriveFile(uploaded.fileId); } catch { const {error:queueError}=await supabase.rpc("queue_drive_cleanup",{p_center_id:context.centerId!,p_drive_file_id:uploaded.fileId,p_drive_path_key:uploaded.pathKey,p_source_type:"application_document",p_reason:"Metadata registration and compensating deletion failed"});return { error: queueError?"নথি নিবন্ধন ও Drive rollback ব্যর্থ হয়েছে। জরুরি প্রশাসনিক সহায়তা নিন।":"নথি নিবন্ধন ব্যর্থ হয়েছে; অবশিষ্ট Drive ফাইল প্রশাসনিক পরিচ্ছন্নতা সারিতে যোগ হয়েছে।" }; }
      return { error: "নথি নিবন্ধন করা যায়নি; অস্থায়ী Drive ফাইল নিরাপদে সরানো হয়েছে।" };
    }
  } catch { return { error: "নথিটি এনক্রিপ্ট করে Google Drive-এ সংরক্ষণ করা যায়নি।" }; }
  revalidatePath(`/operator/applications/${app.id}/documents`); return { success: "নথিটি এনক্রিপ্ট করে সংরক্ষণ করা হয়েছে।" };
}
