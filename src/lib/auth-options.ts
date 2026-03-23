import { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Adapter } from "next-auth/adapters";

// Definimos una interfaz interna para evitar el molesto error de "Property does not exist"
interface CoyoteUser extends User {
  role: string | null;
  isEmployee: boolean;
  membershipTier: string;
  points: number;
}

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
      async authorize(credentials): Promise<any> {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Credenciales incompletas");
        }

        // 1. Intentar buscar en empleados
        let account: any = await prisma.employee.findUnique({
          where: { email: credentials.email },
        });
        let isEmployee = true;

        // 2. Si no es empleado, buscar en usuarios/clientes
        if (!account) {
          account = await prisma.user.findUnique({
            where: { email: credentials.email },
          });
          isEmployee = false;
        }

        if (!account?.password) throw new Error("Usuario no localizado");

        const isValid = await bcrypt.compare(credentials.password, account.password);
        if (!isValid) throw new Error("Cifrado incorrecto");

        if (isEmployee && account.isActive === false) {
          throw new Error("Cuenta desactivada");
        }

        // Retornamos el objeto con la forma exacta que espera el .d.ts
        return {
          id: account.id,
          name: account.name,
          email: account.email,
          image: account.image || null,
          role: account.role || "USER",
          isEmployee: isEmployee,
          membershipTier: isEmployee ? "NONE" : account.membershipTier || "BRONZE",
          points: isEmployee ? 0 : account.points || 0,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as CoyoteUser;
        token.id = u.id;
        token.role = u.role;
        token.isEmployee = u.isEmployee;
        token.membershipTier = u.membershipTier;
        token.points = u.points;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const s = session.user as any;
        s.id = token.id;
        s.role = token.role;
        s.isEmployee = token.isEmployee;
        s.membershipTier = token.membershipTier;
        s.points = token.points;
      }
      return session;
    },
  },
  pages: { signIn: '/crm/login', error: '/crm/login' },
  secret: process.env.NEXTAUTH_SECRET,
};