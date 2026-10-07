"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import {
  isSignatureStorageConfigured,
  uploadEncryptedSignature,
} from "@/lib/google-drive/signature-storage";
import { createClient } from "@/lib/supabase/server";

export type SignatureUploadState = {
  error?: string;
  success?: boolean;
};

const MAX_SIGNATURE_BYTES = 512 * 1024;

function hasValidSignatureHeader(bytes: Buffer, mimeType: string): boolean {
  if (mimeType === "image/png") {
    return bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  }

  if (mimeType === "image/webp") {
    return (
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  return false;
}

export async function uploadSignatureAction(
  _previousState: SignatureUploadState,
  formData: FormData,
): Promise<SignatureUploadState> {
  await requireRole(["owner"]);

  if (!isSignatureStorageConfigured()) {
    return { error: "Encrypted Google Drive storage এখনো কনফিগার করা হয়নি।" };
  }

  const file = formData.get("signature");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "PNG অথবা WebP স্বাক্ষরের ছবি নির্বাচন করুন।" };
  }

  if (
    !["image/png", "image/webp"].includes(file.type) ||
    file.size > MAX_SIGNATURE_BYTES
  ) {
    return { error: "শুধু PNG/WebP এবং সর্বোচ্চ ৫১২ KB ফাইল গ্রহণযোগ্য।" };
  }

  const plainBytes = Buffer.from(await file.arrayBuffer());
  if (!hasValidSignatureHeader(plainBytes, file.type)) {
    return { error: "ফাইলটির প্রকৃত image format সঠিক নয়।" };
  }

  const fileHash = createHash("sha256").update(plainBytes).digest("hex");
  const encryptedFileName = `enc_${fileHash.slice(0, 24)}.bin`;

  try {
    const uploaded = await uploadEncryptedSignature(
      plainBytes,
      encryptedFileName,
    );
    const supabase = await createClient();
    const { error } = await supabase.rpc("register_center_signature", {
      p_drive_file_id: uploaded.fileId,
      p_file_hash: fileHash,
      p_mime_type: file.type,
      p_encrypted_size: uploaded.encryptedSize,
    });

    if (error) {
      return { error: "ফাইল আপলোড হয়েছে, কিন্তু signature সক্রিয় করা যায়নি। প্রশাসকের সহায়তা নিন।" };
    }
  } catch {
    return { error: "স্বাক্ষরটি encrypted storage-এ সংরক্ষণ করা যায়নি।" };
  }

  revalidatePath("/owner/signature");
  return { success: true };
}
