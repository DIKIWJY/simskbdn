"use client";

import type { ReactNode } from "react";
import RoleGate from "@/components/auth/RoleGate";

// Padanan dari roles={["admin"]} pada setiap <PrivateRoute> di bawah
// path "/admin/*" pada routes/AppRoutes.jsx versi lama.
export default function AdminRoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <RoleGate roles={["admin"]}>{children}</RoleGate>;
}
