// src/app/api/auth/crm/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validación básica de input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña requeridos' },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        isActive: true,
        role: true,
      },
    });

    // Respuesta genérica — no revelar si el email existe o no
    if (!employee || !employee.isActive) {
      return NextResponse.json(
        { error: 'Credenciales inválidas o cuenta desactivada' },
        { status: 401 }
      );
    }

    // ⚠️  Si tus passwords aún son texto plano en la DB, usa esto temporalmente:
    //     const passwordOk = employee.password === password;
    // ✅  Con bcrypt (recomendado):
    const passwordOk = await bcrypt.compare(password, employee.password);

    if (!passwordOk) {
      return NextResponse.json(
        { error: 'Credenciales inválidas o cuenta desactivada' },
        { status: 401 }
      );
    }

    // Setear cookie de sesión
    const cookieStore = await cookies();
    cookieStore.set('coyote_crm_session', employee.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 horas
      path: '/',
    });

    return NextResponse.json({
      success: true,
      name: employee.name,
      role: employee.role,
    });

  } catch (error) {
    console.error('[CRM Auth] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}