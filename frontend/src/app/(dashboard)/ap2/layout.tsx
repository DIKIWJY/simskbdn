"use client";

import type { ReactNode } from "react";
import RoleGate from "@/components/auth/RoleGate";

// Padanan dari roles={["ap2"]} pada setiap <PrivateRoute> di bawah
// path "/ap2/*" pada routes/AppRoutes.jsx versi lama.
export default function AP2RoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <RoleGate roles={["ap2"]}>{children}</RoleGate>;
}
