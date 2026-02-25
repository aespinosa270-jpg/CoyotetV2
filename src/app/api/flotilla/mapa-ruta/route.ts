// src/app/api/flotilla/mapa-ruta/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Última posición conocida de cada empleado (telemetría más reciente)
    const ultimasTelemetrias = await prisma.telemetry.findMany({
      distinct: ['employeeId'],
      orderBy: { timestamp: 'desc' },
      include: {
        employee: { select: { id: true, name: true } }
      }
    });

    // Órdenes activas del día con coordenadas de entrega o dirección
    const ordenesActivas = await prisma.order.findMany({
      where: {
        logisticsType: 'COYOTE_LOCAL',
        status: { in: ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED'] }
      },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        address: true,
        status: true,
        deliveryLat: true,
        deliveryLng: true,
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ choferes: ultimasTelemetrias, paradas: ordenesActivas });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}