import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { Adapter } from "next-auth/adapters"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Credenciales incompletas");
        }

        let account: any = await prisma.employee.findUnique({
          where: { email: credentials.email },
        });
        let isEmployee = true;

        if (!account) {
          account = await prisma.user.findUnique({
            where: { email: credentials.email },
          });
          isEmployee = false;
        }

        if (!account?.password) throw new Error("Usuario no encontrado");

        const isValid = await bcrypt.compare(credentials.password, account.password);
        if (!isValid) throw new Error("Contraseña incorrecta");

        if (isEmployee && account.isActive === false) {
          throw new Error("Cuenta desactivada");
        }

        return {
          id: account.id,
          name: account.name,
          email: account.email,
          image: (account as any).image || null,
          role: account.role || "USER",
          isEmployee,
          membershipTier: isEmployee ? "NONE" : (account as any).membershipTier || "BRONZE",
          points: isEmployee ? 0 : (account as any).points || 0,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isEmployee = user.isEmployee;
        token.membershipTier = user.membershipTier;
        token.points = user.points;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.isEmployee = token.isEmployee;
        session.user.membershipTier = token.membershipTier;
        session.user.points = token.points;
      }
      return session;
    },
  },
  pages: { signIn: '/crm/login', error: '/crm/login' },
  secret: process.env.NEXTAUTH_SECRET,
};