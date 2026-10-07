import type { ReactNode } from "react";
import { ProtectedDashboardLayout } from "@/components/layouts/ProtectedDashboardLayout";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedDashboardLayout role="super_admin">
      {children}
    </ProtectedDashboardLayout>
  );
}
