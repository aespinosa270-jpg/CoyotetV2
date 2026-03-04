import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const url = req.nextUrl;

  // 1. PROTEGER TODO EL CRM
  // Si intentan entrar a cualquier ruta del CRM (excepto el login) sin token, rebotan al login.
  if (url.pathname.startsWith("/crm") && !url.pathname.startsWith("/crm/login") && !token) {
    return NextResponse.redirect(new URL("/crm/login", req.url));
  }

  // 2. DEFENSA DE LA RUTA ADMIN (Solo para Jack y Stephany)
  if (url.pathname.startsWith("/crm/admin") && token) {
    // Si el rol NO es "ADMIN" (es decir, si es una VENDEDORA o un USER)
    if (token.role !== "ADMIN") {
      // Mandamos a las vendedoras a su ruta operativa designada
      return NextResponse.redirect(new URL("/crm/ventas", req.url)); 
    }
  }

  return NextResponse.next();
}

// Ejecutar el middleware solo en rutas del CRM para no afectar el rendimiento de la tienda
export const config = {
  matcher: [
    "/crm/:path*", 
  ],
};