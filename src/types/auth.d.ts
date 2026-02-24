import NextAuth, { DefaultSession } from "next-auth"

// 🔥 ACTUALIZADO CON TUS PLANES REALES DE OPENPAY
export type MembershipTier = "NONE" | "GOLD" | "BLACK" | "ELITE"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      membershipTier: MembershipTier
    } & DefaultSession["user"]
  }

  interface User {
    role: string
    membershipTier: MembershipTier
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    membershipTier: MembershipTier
  }
}