import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? "fallback-secret-cambiar-en-produccion"
);

export async function POST(req: Request) {
  try {
    // 1. Extraemos password en lugar de pin
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // 2. Buscamos al empleado (ya no necesitamos ts-ignore para pin)
    const employee = await prisma.employee.findFirst({
      where: { 
        email: email.toLowerCase(), 
        isActive: true, 
        role: "LOGISTICA" 
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 401 });
    }

    // 3. Validamos contra el campo password del esquema
    const passwordValida = await bcrypt.compare(password, employee.password);
    if (!passwordValida) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
    }

    // 4. Crear JWT de sesión flotilla (24h)
    const token = await new SignJWT({
      sub:      employee.id,
      name:     employee.name,
      email:    employee.email,
      role:     employee.role,
      type:     "flotilla", 
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET);

    // 5. Guardar en cookie httpOnly
    const cookieStore = await cookies();
    cookieStore.set("flotilla-session", token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 24, // 24h
      path:     "/",
    });

    return NextResponse.json({ ok: true, name: employee.name });
  } catch (err) {
    console.error("Error en login flotilla:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}