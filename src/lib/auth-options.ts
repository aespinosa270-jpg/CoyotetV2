import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma), // Conexión directa a DB
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Credenciales incompletas")
        }

        // 1. Buscar usuario en la Base de Datos Real
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        // 2. Si no existe o no tiene password
        if (!user || !user.password) {
          throw new Error("Usuario no encontrado")
        }

        // 3. Comparar contraseña real con el hash encriptado
        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          throw new Error("Contraseña incorrecta")
        }

        // 4. Retornar usuario exitoso
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role // Persistir el rol real de la DB
      }
      return session
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    }
  }
}