import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs" // 🔥 CORREGIDO: Usando bcryptjs para compatibilidad con Vercel
import { Adapter } from "next-auth/adapters"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("--- 🛡️ SYSTEM BOOT: COYOTE TEXTIL ---");

        if (!credentials?.email || !credentials?.password) {
          throw new Error("SYSTEM_ERROR: Credenciales incompletas.");
        }

        // 1. Buscar en Employee primero
        let account: any = await prisma.employee.findUnique({
          where: { email: credentials.email },
        });
        let isEmployee = true;

        // 2. Si no es empleado, buscar en User (clientes)
        if (!account) {
          account = await prisma.user.findUnique({
            where: { email: credentials.email },
          });
          isEmployee = false;
        }

        if (!account?.password) {
          console.log("❌ ERROR: Nodo no localizado.");
          throw new Error("SYSTEM_ERROR: Nodo no localizado.");
        }

        // Usando bcryptjs para la comparación
        const isValid = await bcrypt.compare(credentials.password, account.password);
        if (!isValid) {
          console.log("⛔ ERROR: Cifrado incorrecto.");
          throw new Error("SYSTEM_ERROR: Cifrado incorrecto.");
        }

        // Bloquear empleados inactivos
        if (isEmployee && account.isActive === false) {
          throw new Error("SYSTEM_ERROR: Cuenta desactivada.");
        }

        console.log(`✅ ACCESO CONCEDIDO: ${account.name} | ROL: ${account.role || 'CLIENTE'}`);

        return {
          id:             account.id,
          name:           account.name,
          email:          account.email!,
          image:          account.image   || null,
          role:           account.role    || "USER",
          isEmployee,
          membershipTier: isEmployee ? "NONE" : (account as any).membershipTier || "BRONZE",
          points:         isEmployee ? 0      : (account as any).points         || 0,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session) {
        return { ...token, ...session };
      }
      if (user) {
        token.id             = user.id;
        token.role           = (user as any).role;
        token.isEmployee     = (user as any).isEmployee;
        token.membershipTier = (user as any).membershipTier;
        token.points         = (user as any).points;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id             = token.id;
        (session.user as any).role           = token.role;
        (session.user as any).isEmployee     = token.isEmployee;
        (session.user as any).membershipTier = token.membershipTier;
        (session.user as any).points         = token.points;
      }
      return session;
    },
  },

  pages: {
    signIn: '/crm/login',
    error:  '/crm/login',
  },

  secret: process.env.NEXTAUTH_SECRET,
};