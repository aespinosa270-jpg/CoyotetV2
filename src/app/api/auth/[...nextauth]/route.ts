import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth-options"

const handler = NextAuth(authOptions)

// Esto es lo que Next.js exige para el App Router
export { handler as GET, handler as POST }