// src/middleware.ts
// Auth.js v5 usa auth() como middleware directamente

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_ROLES = ["ADMIN", "SUPERVISOR", "CONTABILIDAD"];
const AGENT_ROLES = ["VENDEDORA", "LOGISTICA"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session      = req.auth;           // auth() inyecta req.auth en v5
  
  // 🔥 FIX 1: Usar startsWith previene bucles si Vercel inyecta un trailing slash (/crm/login/)
  const isLoginPage  = pathname.startsWith("/crm/login");

  // =========================================================
  // 1. STOREFRONT
  // =========================================================
  const isStorefrontProtected =
    pathname.startsWith("/perfil") ||
    pathname.startsWith("/pedidos");

  if (isStorefrontProtected && !session) {
    return NextResponse.redirect(new URL("/cuenta", req.url));
  }

  // =========================================================
  // 2. CRM — requiere sesión
  // =========================================================
  if (pathname.startsWith("/crm") && !isLoginPage && !session) {
    return NextResponse.redirect(new URL("/crm/login", req.url));
  }

  // Si ya tiene sesión y va al login → redirige según rol
  if (isLoginPage && session) {
    // 🔥 FIX 2: Leemos "role" en lugar de "employeeRole" porque así lo armó NextAuth en tu auth.ts
    const role = (session.user as any)?.role ?? ""; 
    
    return NextResponse.redirect(
      new URL(ADMIN_ROLES.includes(role) ? "/crm/admin" : "/crm/agente", req.url)
    );
  }

  // =========================================================
  // 3. CONTROL DE ACCESO POR ROL
  // =========================================================
  if (session) {
    // Mismo ajuste aquí para leer "role"
    const role = (session.user as any)?.role ?? "";

    if (pathname.startsWith("/crm/admin") && !ADMIN_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/crm/agente", req.url));
    }

    if (pathname.startsWith("/crm/agente") && ADMIN_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/crm/admin", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/crm/:path*",
    "/perfil/:path*",
    "/pedidos/:path*",
  ],
};