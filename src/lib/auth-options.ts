import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt" 
import { Adapter } from "next-auth/adapters" 

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter, 
  
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("--- 🛡️ SYSTEM BOOT: COYOTE TEXTIL ---");

        if (!credentials?.email || !credentials?.password) {
          throw new Error("SYSTEM_ERROR: Credenciales incompletas.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          console.log("❌ ERROR: Nodo no localizado en la red.");
          throw new Error("SYSTEM_ERROR: Nodo no localizado.");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        
        console.log(`> Evaluando firma: ${user.email} | Match: ${isValid}`);

        if (!isValid) {
          console.log("⛔ ERROR: Cifrado incorrecto. Acceso denegado.");
          throw new Error("SYSTEM_ERROR: Cifrado incorrecto.");
        }

        console.log(`✅ ACCESO CONCEDIDO: ${user.name} | ROL: ${user.role}`);

        return {
          id: user.id,
          name: user.name,
          email: user.email!, 
          image: user.image,
          role: user.role, 
        } as any
      }
    })
  ],

  callbacks: {
    // 1. Inyectamos el ROL y el ID en el token encriptado
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role; 
      }
      return token;
    },
    // 2. Extraemos el ROL del token para usarlo en el frontend y backend
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role; 
      }
      return session;
    }
  },

  pages: {
    // 🔥 EL ARREGLO ESTÁ AQUÍ: Ahora apunta a tu interfaz brutalista, no al /login fantasma
    signIn: '/cuenta', 
    error: '/cuenta',  
  },

  secret: process.env.NEXTAUTH_SECRET,
}