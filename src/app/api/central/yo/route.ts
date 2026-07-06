// src/app/api/central/yo/route.ts
// GET: devuelve el empleado logueado (desde la cookie JWT). DELETE: cierra sesión.

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

export async function GET(req: NextRequest) {
  const token = req.cookies.get('central_sesion')?.value;
  if (!token) return NextResponse.json({ error: 'Sin sesión' }, { status: 401 });
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return NextResponse.json({
      empleado: { id: payload.id, nombre: payload.nombre, rol: payload.rol },
    });
  } catch {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('central_sesion', '', { maxAge: 0, path: '/' });
  return res;
}
