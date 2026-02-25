// src/app/flotilla/FlotillaClient.tsx
"use client";

import { useSession } from "next-auth/react";
import { useGpsTracker } from "@/hooks/useGpsTracker";

export default function FlotillaClient() {
  const { data: session } = useSession();
  
  // Cuando tengas login de empleados, aquí irá el employeeId real.
  // Por ahora usa el id del usuario de sesión como fallback.
  const employeeId = (session?.user as any)?.employeeId ?? session?.user?.email ?? null;

  useGpsTracker(employeeId);

  // No renderiza nada — solo activa el GPS en segundo plano
  return null;
}