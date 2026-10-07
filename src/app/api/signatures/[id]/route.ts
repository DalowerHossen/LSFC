import { getAuthContext, getMfaStep } from "@/lib/auth/session";
import { downloadDecryptedSignature } from "@/lib/google-drive/signature-storage";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAuthContext();
  if (!context || getMfaStep(context)) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (context.role !== "super_admin" && context.centerStatus !== "active") {
    return new Response("Center inactive", { status: 403 });
  }

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("center_signatures")
    .select("drive_file_id, mime_type")
    .eq("id", id)
    .single();

  if (error || !data) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const plainBytes = await downloadDecryptedSignature(data.drive_file_id);
    return new Response(new Uint8Array(plainBytes), {
      headers: {
        "content-type": data.mime_type,
        "cache-control": "private, no-store, max-age=0",
        "content-disposition": 'inline; filename="signature"',
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new Response("Signature unavailable", { status: 503 });
  }
}
