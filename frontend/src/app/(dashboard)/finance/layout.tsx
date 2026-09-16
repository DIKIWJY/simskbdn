"use client";

import type { ReactNode } from "react";
import RoleGate from "@/components/auth/RoleGate";

// Padanan dari roles={["finance"]} pada setiap <PrivateRoute> di bawah
// path "/finance/*" pada routes/AppRoutes.jsx versi lama.
export default function FinanceRoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <RoleGate roles={["finance"]}>{children}</RoleGate>;
}
