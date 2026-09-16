"use client";

import type { ReactNode } from "react";
import RoleGate from "@/components/auth/RoleGate";

// Padanan dari roles={["buyer"]} pada setiap <PrivateRoute> di bawah
// path "/buyer/*" pada routes/AppRoutes.jsx versi lama.
export default function BuyerRoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <RoleGate roles={["buyer"]}>{children}</RoleGate>;
}
