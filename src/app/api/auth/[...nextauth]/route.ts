import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

/**
 * Usamos 'as any' aquí como el "escape hatch" final. 
 * TypeScript ya validó la lógica pesada en el archivo de opciones, 
 * pero el motor interno de NextAuth a veces choca con los campos 
 * personalizados (isEmployee, userType, etc.) al crear el handler.
 */
const handler = NextAuth(authOptions as any);

export { handler as GET, handler as POST };