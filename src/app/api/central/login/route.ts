// src/app/api/central/login/route.ts
// Login REAL contra la tabla Employee de la RDS (bcrypt + JWT en cookie httpOnly)

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Faltan email o contraseña' }, { status: 400 });
    }

    const emp = await prisma.employee.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!emp || !emp.isActive || emp.isBlocked) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, emp.password);
    if (!ok) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const token = await new SignJWT({
      id: emp.id,
      nombre: emp.name,
      rol: emp.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('12h')
      .sign(SECRET);

    const res = NextResponse.json({
      ok: true,
      empleado: { id: emp.id, nombre: emp.name, rol: emp.role },
    });
    res.cookies.set('central_sesion', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 12,
      path: '/',
    });
    return res;
  } catch (e) {
    console.error('[central/login]', e);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
