// src/app/api/auth/[...nextauth]/route.ts
// (solo la parte relevante — callbacks y authorize)
// Ajusta según tu provider actual (credentials, Google, etc.)

import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Busca primero en Employee (CRM interno)
        const employee = await prisma.employee.findUnique({
          where: { email: credentials.email },
        });

        if (employee && employee.isActive) {
          const valid = await bcrypt.compare(credentials.password, employee.password);
          if (valid) {
            return {
              id: employee.id,
              email: employee.email,
              name: employee.name,
              // Campos custom que viajan al token
              employeeId: employee.id,
              employeeRole: employee.role, // EmployeeRole enum: ADMIN, VENDEDORA, etc.
              userType: "employee",
            };
          }
        }

        // Si no es Employee, busca en User (storefront)
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (user) {
          const valid = await bcrypt.compare(credentials.password, user.password);
          if (valid) {
            return {
              id: user.id,
              email: user.email,
              name: user.name ?? undefined,
              userType: "user",
            };
          }
        }

        return null;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // Primera vez que hace login — `user` tiene los datos del authorize
      if (user) {
        token.employeeId   = (user as any).employeeId   ?? null;
        token.employeeRole = (user as any).employeeRole ?? null;
        token.userType     = (user as any).userType     ?? "user";
      }
      return token;
    },

    async session({ session, token }) {
      // Expone los campos al cliente via useSession()
      session.user.employeeId   = token.employeeId   as string | null;
      session.user.employeeRole = token.employeeRole as string | null;
      session.user.userType     = token.userType     as string;
      return session;
    },
  },

  pages: {
    signIn: "/crm/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };