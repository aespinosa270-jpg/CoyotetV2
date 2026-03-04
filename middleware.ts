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

export const config = {
  matcher: ["/crm/:path*"],
};
