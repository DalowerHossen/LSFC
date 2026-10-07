import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  CorrectionChange,
  CorrectionRequest,
  CorrectionStatus,
} from "@/types/correction";

type RequestRow = {
  id: string;
  entity_id: string;
  requested_by: string;
  reason: string;
  requested_changes: CorrectionChange;
  status: CorrectionStatus;
  review_note: string | null;
  created_at: string;
};

type ApplicationRow = {
  id: string;
  tracking_id: string;
  service_code: string;
};

export async function listCorrectionRequests(
  requestedBy?: string,
): Promise<CorrectionRequest[]> {
  const supabase = await createClient();
  let query = supabase
    .from("edit_requests")
    .select("id, entity_id, requested_by, reason, requested_changes, status, review_note, created_at")
    .eq("entity_type", "application")
    .order("created_at", { ascending: false })
    .limit(100);

  if (requestedBy) query = query.eq("requested_by", requestedBy);
  const { data, error } = await query;
  if (error || !data) return [];

  const requests = data as RequestRow[];
  if (requests.length === 0) return [];

  const applicationIds = [...new Set(requests.map((item) => item.entity_id))];
  const requesterIds = [...new Set(requests.map((item) => item.requested_by))];

  const [{ data: applications }, { data: profiles }, { data: services }] =
    await Promise.all([
      supabase
        .from("applications")
        .select("id, tracking_id, service_code")
        .in("id", applicationIds),
      supabase.from("profiles").select("id, full_name").in("id", requesterIds),
      supabase.from("services").select("code, name_bn"),
    ]);

  const appMap = new Map(
    ((applications ?? []) as ApplicationRow[]).map((item) => [item.id, item]),
  );
  const profileMap = new Map(
    ((profiles ?? []) as { id: string; full_name: string }[]).map((item) => [
      item.id,
      item.full_name,
    ]),
  );
  const serviceMap = new Map(
    ((services ?? []) as { code: string; name_bn: string }[]).map((item) => [
      item.code,
      item.name_bn,
    ]),
  );

  return requests.flatMap((request) => {
    const application = appMap.get(request.entity_id);
    if (!application) return [];
    return [
      {
        id: request.id,
        applicationId: request.entity_id,
        trackingId: application.tracking_id,
        serviceName:
          serviceMap.get(application.service_code) ?? application.service_code,
        requestedByName:
          profileMap.get(request.requested_by) ?? "অজানা ব্যবহারকারী",
        reason: request.reason,
        change: request.requested_changes,
        status: request.status,
        reviewNote: request.review_note,
        createdAt: request.created_at,
      },
    ];
  });
}
