import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt" 
import { Adapter } from "next-auth/adapters" 

export const authOptions: NextAuthOptions = {
  // Conectamos Prisma para persistencia, casteando como Adapter para evitar conflictos de tipos
  adapter: PrismaAdapter(prisma) as Adapter, 
  
  // Usamos JWT porque es más rápido y eficiente para el escalado de Huup
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
        // Log para ver en la terminal de VS Code (asegúrate de que aparezca)
        console.log("--- 🛡️ AUTH DEBUG: COYOTE TEXTIL ---");

        if (!credentials?.email || !credentials?.password) {
          throw new Error("Credenciales incompletas");
        }

        // Buscamos al socio en la base de datos de Coyote
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          console.log("❌ Usuario no registrado.");
          throw new Error("Usuario no encontrado");
        }

        // Verificamos la contraseña (comparando contra el hash de la DB)
        // Nota: Confirmado que tu pass de prueba es "123"
        const isValid = await bcrypt.compare(credentials.password, user.password);
        
        console.log(`Intento de login: ${user.email} | Válido: ${isValid}`);

        if (!isValid) {
          console.log("⛔ Password incorrecta.");
          throw new Error("Contraseña incorrecta");
        }

        console.log(`✅ Sesión iniciada para: ${user.name} (Rol: ${user.role})`);

        return {
          id: user.id,
          name: user.name,
          email: user.email!, 
          image: user.image,
          // El 'as any' es necesario para que TS acepte tus roles personalizados
          role: user.role as any, 
        }
      }
    })
  ],

  callbacks: {
    // Transferimos el ID y el ROL del usuario al Token JWT
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    // Transferimos los datos del Token a la sesión accesible en el cliente (useSession)
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role 
      }
      return session
    }
  },

  pages: {
    signIn: '/login', // Redirige a tu página personalizada de Coyote.ID
    error: '/login',  // En caso de error, vuelve al login
  },

  // Secreto para firmar las cookies, extraído de tu .env
  secret: process.env.NEXTAUTH_SECRET,
}