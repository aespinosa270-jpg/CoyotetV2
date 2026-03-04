import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  // Extraemos el token directamente para saber si hay sesión
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  const url = req.nextUrl;

  // 1. PROTEGER RUTAS DEL CRM
  // Si alguien intenta entrar a /crm/admin (o cualquier subruta) y NO tiene sesión...
  if (url.pathname.startsWith("/crm/admin") && !token) {
    // Lo rebotamos al login del CRM, no a /cuenta
    return NextResponse.redirect(new URL("/crm/login", req.url));
  }

  // 2. VALIDAR ROLES (Opcional pero recomendado)
  // Si tiene sesión, pero no es ADMIN ni de la Jauría, lo sacamos del CRM
  if (url.pathname.startsWith("/crm/admin") && token) {
    if (token.role === "USER") {
      // Un cliente normal intentando entrar al CRM -> Pa' fuera
      return NextResponse.redirect(new URL("/cuenta", req.url));
    }
  }

  // Si todo está bien, lo dejamos pasar
  return NextResponse.next();
}

// Aquí le decimos al middleware en qué rutas debe ejecutarse para no hacer lenta tu app
export const config = {
  matcher: [
    "/crm/admin/:path*", 
    // Puedes agregar más rutas aquí si lo necesitas
  ],
};