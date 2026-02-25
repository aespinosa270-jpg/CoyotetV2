// src/app/api/admin/flotilla/ordenes/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const ordenes = await prisma.order.findMany({
      where: { logisticsType: "COYOTE_LOCAL" },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        customerName: true,
        address: true,
        status: true,
        pickupLocation: true,
        evidenceUrl: true,
        deliveryLat: true,
        deliveryLng: true,
      },
    });
    return NextResponse.json(ordenes);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}