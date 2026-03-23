// src/middleware.ts
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Roles que acceden a /crm/admin
const ADMIN_ROLES = ["ADMIN", "SUPERVISOR", "CONTABILIDAD"];
// Roles que acceden a /crm/agente
const AGENT_ROLES = ["VENDEDORA", "LOGISTICA"];

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = req.nextUrl;
  const isLoginPage = pathname === "/crm/login";

  // =========================================================
  // 1. STOREFRONT — rutas protegidas del e-commerce
  // =========================================================
  const isStorefrontProtected =
    pathname.startsWith("/perfil") ||
    pathname.startsWith("/pedidos");

  if (isStorefrontProtected && !token) {
    return NextResponse.redirect(new URL("/cuenta", req.url));
  }

  // =========================================================
  // 2. CRM — requiere sesión activa
  // =========================================================
  if (pathname.startsWith("/crm") && !isLoginPage && !token) {
    return NextResponse.redirect(new URL("/crm/login", req.url));
  }

  // Si ya tiene sesión y va al login, redirige según su rol
  if (isLoginPage && token) {
    const role = token.employeeRole as string;
    if (ADMIN_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/crm/admin", req.url));
    }
    return NextResponse.redirect(new URL("/crm/agente", req.url));
  }

  // =========================================================
  // 3. CONTROL DE ACCESO POR ROL
  // =========================================================
  if (token) {
    const role = token.employeeRole as string;

    // Solo ADMIN/SUPERVISOR/CONTABILIDAD pueden ver /crm/admin
    if (pathname.startsWith("/crm/admin") && !ADMIN_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/crm/agente", req.url));
    }

    // Solo VENDEDORA/LOGISTICA van a /crm/agente
    // (ADMIN que entre a /crm/agente accidentalmente → redirigir a admin)
    if (pathname.startsWith("/crm/agente") && ADMIN_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/crm/admin", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/crm/:path*",
    "/perfil/:path*",
    "/pedidos/:path*",
  ],
};