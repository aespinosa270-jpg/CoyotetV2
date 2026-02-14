import NextAuth, { DefaultSession } from "next-auth"

// 👇 CORRECCIÓN: Alineamos los roles con lo que definiste en Prisma
// (silver = público, gold = socio, black = distribuidor)
export type UserRole = "silver" | "gold" | "black" | "admin"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole
      // Opcional: Si vas a usar número de membresía, recuerda agregarlo a tu Schema de Prisma también
      membershipNumber?: string 
    } & DefaultSession["user"]
  }

  interface User {
    role: UserRole
    membershipNumber?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: UserRole
  }
}