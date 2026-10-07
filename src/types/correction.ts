export type CorrectionStatus =
  | "pending_owner"
  | "pending_super_admin"
  | "approved"
  | "rejected";

export type CorrectionChange = {
  field: "citizen_name" | "citizen_mobile" | "government_fee";
  current_value: string;
  proposed_value: string;
};

export type CorrectionRequest = {
  id: string;
  applicationId: string;
  trackingId: string;
  serviceName: string;
  requestedByName: string;
  reason: string;
  change: CorrectionChange;
  status: CorrectionStatus;
  reviewNote: string | null;
  createdAt: string;
};
