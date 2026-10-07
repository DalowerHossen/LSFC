import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  ApplicationListItem,
  ApplicationStatus,
} from "@/types/application";

type ApplicationRow = {
  id: string;
  tracking_id: string;
  receipt_number: string | null;
  citizen_name: string;
  citizen_mobile: string;
  service_code: string;
  status: ApplicationStatus;
  government_fee: number | string;
  assistance_fee: number | string;
  additional_fee: number | string;
  total_fee: number | string;
  created_at: string;
  completed_at: string | null;
};

type ServiceRow = {
  code: string;
  name_bn: string;
};

export async function listApplications(
  statuses: ApplicationStatus[],
): Promise<ApplicationListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, tracking_id, receipt_number, citizen_name, citizen_mobile, service_code, status, government_fee, assistance_fee, additional_fee, total_fee, created_at, completed_at",
    )
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];

  const rows = data as ApplicationRow[];
  const serviceCodes = [...new Set(rows.map((row) => row.service_code))];
  const serviceNames = new Map<string, string>();

  if (serviceCodes.length > 0) {
    const { data: services } = await supabase
      .from("services")
      .select("code, name_bn")
      .in("code", serviceCodes);

    for (const service of (services ?? []) as ServiceRow[]) {
      serviceNames.set(service.code, service.name_bn);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    trackingId: row.tracking_id,
    receiptNumber: row.receipt_number,
    citizenName: row.citizen_name,
    citizenMobile: row.citizen_mobile,
    serviceCode: row.service_code,
    serviceName: serviceNames.get(row.service_code) ?? row.service_code,
    status: row.status,
    governmentFee: Number(row.government_fee),
    assistanceFee: Number(row.assistance_fee),
    additionalFee: Number(row.additional_fee),
    totalFee: Number(row.total_fee),
    createdAt: row.created_at,
    completedAt: row.completed_at,
  }));
}
