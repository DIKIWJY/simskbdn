"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import type { UserRole } from "@/types";

interface RoleGateProps {
  roles?: UserRole[];
  children: ReactNode;
}

/**
 * RoleGate — padanan dari bagian `roles` pada <PrivateRoute> di
 * routes/AppRoutes.jsx (versi Vite/React Router):
 *
 *   if (roles && user?.role && !roles.includes(user.role))
 *     return <Navigate to="/unauthorized" replace/>;
 *
 * Pengecekan "sudah login atau belum" sudah ditangani satu level di atas oleh
 * app/(dashboard)/layout.jsx, jadi komponen ini murni fokus ke pengecekan role.
 */
export default function RoleGate({ roles, children }: RoleGateProps) {
  const { user } = useAuthStore();
  const router = useRouter();

  const allowed = !roles || !user?.role || roles.includes(user.role);

  useEffect(() => {
    if (!allowed) {
      router.replace("/unauthorized");
    }
  }, [allowed, router]);

  if (!allowed) return null;
  return children;
}
