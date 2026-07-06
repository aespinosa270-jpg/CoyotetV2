// src/app/api/central/stats/route.ts
// Estadísticas REALES del día, calculadas de la tabla Llamada en la RDS.

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET() {
  try {
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);

    const [total, ventas, prom] = await Promise.all([
      prisma.llamada.count({ where: { createdAt: { gte: inicioDia } } }),
      prisma.llamada.count({
        where: { createdAt: { gte: inicioDia }, resultado: 'Venta cerrada' },
      }),
      prisma.llamada.aggregate({
        where: { createdAt: { gte: inicioDia } },
        _avg: { duracionSeg: true },
      }),
    ]);

    const avgSeg = Math.round(prom._avg.duracionSeg || 0);
    const durProm = `${Math.floor(avgSeg / 60)}:${String(avgSeg % 60).padStart(2, '0')}`;

    return NextResponse.json({ llamadasHoy: total, ventasHoy: ventas, duracionPromedio: durProm });
  } catch (e) {
    console.error('[central/stats]', e);
    return NextResponse.json({ llamadasHoy: 0, ventasHoy: 0, duracionPromedio: '0:00' });
  }
}
