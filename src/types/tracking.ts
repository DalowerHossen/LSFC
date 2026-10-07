import type { ApplicationStatus } from "./application";

export type PublicTrackingResult = {
  trackingId: string;
  receiptNumber: string | null;
  centerName: string;
  serviceName: string;
  status: ApplicationStatus;
  totalFee: number;
  submittedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

export type TrackingState = {
  error?: string;
  result?: PublicTrackingResult;
};
