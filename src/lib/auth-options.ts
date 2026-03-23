import { NextAuthOptions } from "next-auth";
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
      async authorize(credentials): Promise<any> {
        if (!credentials?.email || !credentials?.password) return null;

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
              employeeId: employee.id,
              employeeRole: employee.role,
              userType: "employee",
            };
          }
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (user) {
          const valid = await bcrypt.compare(credentials.password, user.password);
          if (valid) {
            return {
              id: user.id,
              email: user.email,
              name: user.name ?? "",
              employeeId: null,
              employeeRole: null,
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
      if (user) {
        const u = user as any;
        token.id = u.id;
        token.employeeId = u.employeeId ?? null;
        token.employeeRole = u.employeeRole ?? null;
        token.userType = u.userType ?? "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.employeeId = token.employeeId as string | null;
        session.user.employeeRole = token.employeeRole as string | null;
        session.user.userType = token.userType as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/crm/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};