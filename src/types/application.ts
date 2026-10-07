export type ServiceOption = {
  code: string;
  name: string;
  assistanceFee: number;
  extraPageFee: number;
};

export type CreatedApplication = {
  applicationId: string;
  trackingId: string;
  receiptNumber: string;
  totalFee: number;
};

export type ApplicationFormState = {
  error?: string;
  application?: CreatedApplication;
};

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "in_progress"
  | "completed"
  | "cancelled_by_approval";

export type ApplicationListItem = {
  id: string;
  trackingId: string;
  receiptNumber: string | null;
  citizenName: string;
  citizenMobile: string;
  serviceCode: string;
  serviceName: string;
  status: ApplicationStatus;
  governmentFee: number;
  assistanceFee: number;
  additionalFee: number;
  totalFee: number;
  createdAt: string;
  completedAt: string | null;
};

export type WorkflowActionState = {
  error?: string;
  success?: boolean;
};
