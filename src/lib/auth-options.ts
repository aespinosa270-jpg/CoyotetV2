// src/lib/auth-options.ts
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          console.log("❌ ERROR: Nodo no localizado.");
          throw new Error("SYSTEM_ERROR: Nodo no localizado.");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        
        if (!isValid) {
          console.log("⛔ ERROR: Cifrado incorrecto.");
          throw new Error("SYSTEM_ERROR: Cifrado incorrecto.");
        }

        console.log(`✅ ACCESO CONCEDIDO: ${user.name} | TIER: ${user.membershipTier} | PTS: ${user.points}`);

        // 🔥 RETORNAMOS TODO EL ADN DEL SOCIO (TIER Y PUNTOS)
        return {
          id: user.id,
          name: user.name,
          email: user.email!, 
          image: user.image,
          role: user.role, 
          membershipTier: user.membershipTier as any,
          points: user.points, // 💳 BÓVEDA DE PUNTOS
        }
      }
    })
  ],

  callbacks: {
    // 🔄 MOTOR DE SINCRONIZACIÓN DE TOKEN
    async jwt({ token, user, trigger, session }) {
      // 1. Manejo de actualización manual (Vital para activar beneficios tras compra)
      if (trigger === "update" && session) {
        console.log("🔄 REFRESCANDO ADN DE SESIÓN...");
        return { ...token, ...session };
      }

      // 2. Inyección inicial al loguearse
      if (user) {
        token.id = user.id;
        token.role = (user as any).role; 
        token.membershipTier = (user as any).membershipTier;
        token.points = (user as any).points; // 🔥 PUNTOS ALMACENADOS EN EL TOKEN
      }
      return token;
    },

    // 🌍 EXPOSICIÓN DE DATOS AL FRONTEND (PERFIL Y CATÁLOGO)
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role; 
        (session.user as any).membershipTier = token.membershipTier; // 🏷️ DESCUENTOS ACTIVOS
        (session.user as any).points = token.points; // 💳 WALLET VISIBLE
      }
      return session;
    }
  },

  pages: {
    signIn: '/cuenta', 
    error: '/cuenta',  
  },

  secret: process.env.NEXTAUTH_SECRET,
}