// src/auth.ts  ← archivo raíz (Auth.js v5 / NextAuth v5)
// Inicializamos NextAuth usando la configuración centralizada en `authOptions`.
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
