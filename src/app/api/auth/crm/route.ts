// src/app/api/auth/crm/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // 1. Buscamos al empleado
    const employee = await prisma.employee.findUnique({
      where: { email }
    });

    // 2. Validamos credenciales y Kill Switch (isActive)
    // NOTA: Para MVP usamos texto plano. En prod usa bcrypt.compare()
    if (!employee || employee.password !== password || !employee.isActive) {
      return NextResponse.json({ error: 'Credenciales inválidas o cuenta desactivada' }, { status: 401 });
    }

    // 3. Generamos la sesión (Cookie HTTP Only, impenetrable desde JavaScript)
    // 🔥 AQUÍ ESTÁ LA CORRECCIÓN VITAL: AGREGAMOS AWAIT 🔥
    const cookieStore = await cookies();
    
    cookieStore.set('coyote_crm_session', employee.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 horas de turno
      path: '/',
    });

    return NextResponse.json({ success: true, name: employee.name });

  } catch (error) {
    console.error('Error en Login CRM:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}