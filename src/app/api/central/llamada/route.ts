// src/app/api/central/llamada/route.ts
// Guarda la interacción REAL de la llamada en la RDS (Postgres) vía Prisma.
// Requiere el modelo `Llamada` en schema.prisma (ver bloque incluido) + npx prisma db push

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { telefono, nombre, empresa, resultado, nota, duracionSeg, agente } = body;

    if (!telefono || !resultado || !nota) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: telefono, resultado, nota' },
        { status: 400 },
      );
    }

    const llamada = await prisma.llamada.create({
      data: {
        telefono: String(telefono).replace(/\D/g, ''),
        nombre: nombre || null,
        empresa: empresa || null,
        resultado,
        nota,
        duracionSeg: Number(duracionSeg) || 0,
        agente: agente || null,
      },
    });

    return NextResponse.json({ ok: true, id: llamada.id });
  } catch (e) {
    console.error('[central/llamada]', e);
    return NextResponse.json({ error: 'Error guardando en la base' }, { status: 500 });
  }
}

export async function GET() {
  // Últimas 50 llamadas registradas (para historial futuro)
  const llamadas = await prisma.llamada.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return NextResponse.json({ llamadas });
}
