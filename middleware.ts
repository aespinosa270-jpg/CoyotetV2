// src/middleware.ts
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_EMAILS = [
  "jackrizk@coyotetextil.com",
  "stephanyrizk@coyotetextil.com",
];

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  const { pathname } = req.nextUrl;
  const isLoginPage  = pathname === "/crm/login";

  // =======================================================================
  // 🐺 1. PROTECCIÓN DE LA TIENDA PÚBLICA (E-Commerce)
  // =======================================================================
  const isStorefrontProtectedRoute = 
    pathname.startsWith("/checkout") || 
    pathname.startsWith("/perfil") || 
    pathname.startsWith("/pedidos");

  if (isStorefrontProtectedRoute && !token) {
    // Si intentan comprar o ver su perfil sin sesión, a la página de cuenta
    return NextResponse.redirect(new URL("/cuenta", req.url));
  }

  // =======================================================================
  // 🏢 2. PROTECCIÓN DEL CRM INTERNO
  // =======================================================================
  if (pathname.startsWith("/crm") && !isLoginPage && !token) {
    return NextResponse.redirect(new URL("/crm/login", req.url));
  }

  if (isLoginPage && token) {
    return NextResponse.redirect(new URL("/crm", req.url));
  }

  if (pathname.startsWith("/crm/admin") && token) {
    if (!ADMIN_EMAILS.includes(token.email as string)) {
      return NextResponse.redirect(new URL("/crm/agente", req.url));
    }
  }

  if (pathname.startsWith("/crm/agente") && token) {
    if (ADMIN_EMAILS.includes(token.email as string)) {
      return NextResponse.redirect(new URL("/crm/admin", req.url));
    }
  }

  return NextResponse.next();
}

// 🔥 ACTUALIZADO: Le decimos al cadenero en qué pasillos tiene que patrullar
export const config = {
  matcher: [
    "/crm/:path*", 
    "/checkout/:path*", 
    "/perfil/:path*", 
    "/pedidos/:path*"
  ],
};