// src/lib/flotilla-auth.ts
// Helper para leer el JWT de flotilla en Server Components y API routes

import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? "fallback-secret-cambiar-en-produccion"
);

export interface FlotillaSession {
  sub:   string; // employeeId
  name:  string;
  email: string;
  role:  string;
  type:  string;
}

export async function getFlotillaSession(): Promise<FlotillaSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("flotilla-session")?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== "flotilla") return null;

    return payload as unknown as FlotillaSession;
  } catch {
    return null;
  }
}