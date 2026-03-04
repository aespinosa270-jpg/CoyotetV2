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
    maxAge: 30 * 24 * 60 * 60, // 30 días de persistencia
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

        // 1. Buscamos primero en LA JAURIA (Tabla Employee)
        let account: any = await prisma.employee.findUnique({
          where: { email: credentials.email }
        });
        let isEmployee = true;

        // 2. Si no es del equipo interno, buscamos en CLIENTES (Tabla User)
        if (!account) {
          account = await prisma.user.findUnique({
            where: { email: credentials.email }
          });
          isEmployee = false;
        }

        if (!account || !account.password) {
          console.log("❌ ERROR: Nodo no localizado.");
          throw new Error("SYSTEM_ERROR: Nodo no localizado.");
        }

        const isValid = await bcrypt.compare(credentials.password, account.password);
        
        if (!isValid) {
          console.log("⛔ ERROR: Cifrado incorrecto.");
          throw new Error("SYSTEM_ERROR: Cifrado incorrecto.");
        }

        console.log(`✅ ACCESO CONCEDIDO: ${account.name} | ROL: ${account.role}`);

        // 3. Retornamos todo el ADN unificado (Socio o Cliente)
        return {
          id: account.id,
          name: account.name,
          email: account.email!, 
          image: account.image || null,
          role: account.role, 
          membershipTier: isEmployee ? "NONE" : account.membershipTier as any,
          points: isEmployee ? 0 : account.points, 
        }
      }
    })
  ],

  callbacks: {
    // 🔄 MOTOR DE SINCRONIZACIÓN DE TOKEN
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session) {
        console.log("🔄 REFRESCANDO ADN DE SESIÓN...");
        return { ...token, ...session };
      }

      // Inyección inicial al loguearse
      if (user) {
        token.id = user.id;
        token.role = (user as any).role; 
        token.membershipTier = (user as any).membershipTier;
        token.points = (user as any).points;
      }
      return token;
    },

    // 🌍 EXPOSICIÓN DE DATOS AL FRONTEND
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role; 
        (session.user as any).membershipTier = token.membershipTier; 
        (session.user as any).points = token.points; 
      }
      return session;
    }
  },

  pages: {
    signIn: '/cuenta', // Esto se queda igual para manejar a los clientes normales
    error: '/cuenta',  
  },

  secret: process.env.NEXTAUTH_SECRET,
}