import NextAuth from "next-auth"
import { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

// Configuración rápida de autenticación
export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Usuario Maestro "Hardcoded" para que entres ya
        if (
          credentials?.email === "admin@coyote.com" && 
          credentials?.password === "123456"
        ) {
          return { 
            id: "1", 
            name: "Admin Coyote", 
            email: "admin@coyote.com", 
            role: "black" // ROL ELITE
          }
        }
        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) token.role = user.role
      return token
    },
    async session({ session, token }: any) {
      if (session.user) session.user.role = token.role
      return session
    }
  },
  pages: {
    signIn: '/login', // Si tienes página de login personalizada
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }