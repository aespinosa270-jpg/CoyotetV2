import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
// import { PrismaAdapter } from "@auth/prisma-adapter"; // 👈 Comentado porque no se usa con JWT y tabla custom
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // adapter: PrismaAdapter(prisma), // 👈 Desactivado: Evita que NextAuth busque las tablas por defecto (User, Session)
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
        console.log("🔴 1. RECIBIDO DEL FORMULARIO:", credentials);

        if (!credentials?.email || !credentials?.password) {
          console.log("🔴 FALLO: Faltan credenciales");
          return null;
        }

        // Limpiamos espacios accidentales que puedan venir del input
        const emailInput = (credentials.email as string).trim();

        // 1. Buscamos al Agente (Employee) en tu BD
        const employee = await prisma.employee.findUnique({
          where: { email: emailInput }
        });

        console.log("🔴 2. ENCONTRADO EN PRISMA:", employee ? `Sí, ID: ${employee.id}` : "NULL (No existe)");

        if (!employee) {
          console.log("🔴 FALLO: Prisma no encontró el correo exacto:", emailInput);
          return null;
        }

        // 2. Validar contraseña 
        console.log("🔴 3. PASSWORD EN BD:", employee.password);
        console.log("🔴 4. PASSWORD INGRESADO:", credentials.password);

        // ⚠️ Nota: Si usas contraseñas encriptadas después, cambia esto por bcrypt.compare
        const isValid = employee.password === credentials.password; 

        if (!isValid) {
          console.log("🔴 FALLO: Las contraseñas no hacen match exacto.");
          return null;
        }

        console.log("🟢 LOGIN EXITOSO. Pasando al JWT...");

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