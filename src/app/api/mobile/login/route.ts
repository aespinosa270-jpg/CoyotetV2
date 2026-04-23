// app/api/mobile/login/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "FALTAN CREDENCIALES" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: "EL COYOTE NO ENCONTRÓ ESTE RASTRO" }, { status: 401 });
    }

    // Verificar contraseña encriptada
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: "ACCESO DENEGADO. CONTRASEÑA ERRÓNEA." }, { status: 401 });
    }

    // Generar JWT para el celular
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const token = await new SignJWT({ userId: user.id, email: user.email })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d") 
      .sign(secret);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        membershipTier: user.membershipTier, // ¡Indispensable para los precios verdes!
      },
    });
  } catch (error) {
    console.error("MOBILE LOGIN ERROR:", error);
    return NextResponse.json({ error: "FALLO EN EL SISTEMA CENTRAL" }, { status: 500 });
  }
}