import type { CenterStatus } from "./center";

export const USER_ROLES = ["super_admin", "owner", "operator"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type AssuranceLevel = "aal1" | "aal2" | null;

export type AuthContext = {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  centerId: string | null;
  centerName: string | null;
  centerStatus: CenterStatus | null;
  mfaRequired: boolean;
  hasVerifiedTotp: boolean;
  currentAssuranceLevel: AssuranceLevel;
  nextAssuranceLevel: AssuranceLevel;
};

export const ROLE_HOME: Record<UserRole, string> = {
  super_admin: "/superadmin/dashboard",
  owner: "/owner/dashboard",
  operator: "/operator/dashboard",
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}
