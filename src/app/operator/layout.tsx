import type { ReactNode } from "react";
import { ProtectedDashboardLayout } from "@/components/layouts/ProtectedDashboardLayout";

export default function OperatorLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedDashboardLayout role="operator">{children}</ProtectedDashboardLayout>
  );
}
