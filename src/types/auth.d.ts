// src/types/next-auth.d.ts
// Alineado con el auth-options.ts existente de Coyote Textil
// MembershipTier como string union — NO importar de @prisma/client aquí
// para evitar conflicto con el type ya declarado en auth-options

import { DefaultSession } from "next-auth"

export type MembershipTier = "NONE" | "GOLD" | "BLACK" | "ELITE"

declare module "next-auth" {
  interface Session {
    user: {
      id:             string
      role:           string
      isEmployee:     boolean
      membershipTier: MembershipTier
      points:         number
    } & DefaultSession["user"]
  }

  interface User {
    id:             string
    role:           string
    isEmployee:     boolean
    membershipTier: MembershipTier
    points:         number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id:             string
    role:           string
    isEmployee:     boolean
    membershipTier: MembershipTier
    points:         number
  }
}