import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/session";
import type { UserRole } from "@/types/auth";
import { DashboardShell } from "./DashboardShell";

export async function ProtectedDashboardLayout({
  role,
  children,
  allowInactiveCenter = false,
}: {
  role: UserRole;
  children: ReactNode;
  allowInactiveCenter?: boolean;
}) {
  const context = await requireRole([role], { allowInactiveCenter });

  return <DashboardShell context={context}>{children}</DashboardShell>;
}
