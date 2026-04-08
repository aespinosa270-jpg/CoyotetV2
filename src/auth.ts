import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { 
    strategy: "jwt" // 👈 Obligatorio cuando usas Credentials (usuario/password)
  }, 
  pages: {
    signIn: "/login", // O la ruta de login de tu CRM Admin
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // 1. Buscamos al Agente (Employee) en tu BD
        const employee = await prisma.employee.findUnique({
          where: { email: credentials.email as string }
        });

        if (!employee) return null;

        // 2. Validar contraseña 
        // ⚠️ Nota: Si usas contraseñas encriptadas después, cambia esto por bcrypt.compare
        const isValid = employee.password === credentials.password; 

        if (!isValid) return null;

        // 3. Retornamos los datos que van al token
        return {
          id: employee.id,
          email: employee.email,
          name: employee.name,
          role: employee.role, // "ADMIN", "VENDEDORA", etc.
        };
      }
    })
  ],
  callbacks: {
    // Aquí es donde metemos el ID y Rol al Token JWT internamente
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // 🔥 FIX: Le decimos a TS "cállate, yo sé que user trae un role porque lo mandé desde el authorize"
        token.role = (user as any).role; 
      }
      return token;
    },
    // Y aquí pasamos el Token a la Sesión para que la puedas leer en tus rutas
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  // 🔥 Eventos de NextAuth para auditar accesos en el Gran Hermano
  events: {
    async signIn({ user }) {
      if (user?.id) {
        // Hacemos un import dinámico del tracer para evitar problemas de dependencias circulares con NextAuth
        const { createTrace } = await import('@/lib/tracer');
        await createTrace({
          employeeId: user.id,
          actionName: "SYSTEM_LOGIN",
          summary: `${user.name || user.email} inició sesión en el CRM.`,
        });
      }
    },
    async signOut(message) {
      // 🔥 FIX: Validamos que 'token' exista en el mensaje para que TypeScript no llore
      if ("token" in message && message.token?.id) {
        const { createTrace } = await import('@/lib/tracer');
        await createTrace({
          employeeId: message.token.id as string,
          actionName: "SYSTEM_LOGOUT",
          summary: "El agente cerró su sesión.",
        });
      }
    }
  }
});