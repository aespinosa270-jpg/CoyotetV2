// src/types/next-auth.d.ts
// Extiende los tipos de NextAuth para que TypeScript conozca tus campos custom

import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      // Used across the storefront UI (e.g. pricing badges).
      // Values observed: "silver" | "gold" | "black" (and sometimes other strings).
      role?: string | null;

      // Membership (used by membership pages / API integration).
      membershipTier?: string | null; // e.g. "NONE" | "GOLD" | "BLACK" | "ELITE"
      points?: number;
      isEmployee?: boolean;

      employeeId:   string | null;
      employeeRole: string | null; // "ADMIN" | "SUPERVISOR" | "VENDEDORA" | "LOGISTICA" | "CONTABILIDAD"
      userType:     string;        // "employee" | "user"
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    employeeId:   string | null;
    employeeRole: string | null;
    userType:     string;
  }
}