import type { ReactNode } from "react";
import { ProtectedDashboardLayout } from "@/components/layouts/ProtectedDashboardLayout";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return <ProtectedDashboardLayout role="owner" allowInactiveCenter>{children}</ProtectedDashboardLayout>;
}
