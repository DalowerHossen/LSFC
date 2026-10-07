import type { ApplicationStatus } from "./application";

export type ReceiptRecord = {
  id: string;
  applicationId: string;
  receiptNumber: string;
  verificationToken: string;
  version: number;
  signatureId: string | null;
  centerName: string;
  centerAddress: string;
  centerPhone: string;
  serviceName: string;
  citizenName: string;
  citizenMobile: string;
  governmentFee: number;
  assistanceFee: number;
  additionalFee: number;
  totalFee: number;
  issuedAt: string;
  applicationStatus: ApplicationStatus;
};

export type VerifiedReceipt = {
  isValid: boolean;
  receiptNumber: string;
  centerName: string;
  serviceName: string;
  totalFee: number;
  applicationStatus: ApplicationStatus;
  issuedAt: string;
  receiptVersion: number;
  isCurrentVersion: boolean;
};

export type ReceiptFormat = "58mm" | "80mm" | "a4-half";
