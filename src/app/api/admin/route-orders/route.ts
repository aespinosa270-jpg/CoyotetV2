// src/app/api/admin/route-orders/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: listar órdenes de ruta
export async function GET() {
  const orders = await prisma.routeOrder.findMany({
    orderBy: { scheduledAt: "asc" },
    include: { employee: { select: { id: true, name: true } } },
  });
  return NextResponse.json(orders);
}

// POST: crear nueva orden de ruta
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      type, contactName, contactPhone, contactEmail,
      address, addressLat, addressLng,
      scheduledAt, notes, assignedTo,
      originLocation, destLocation,
    } = body;

    if (!type || !contactName || !address || !scheduledAt) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const order = await prisma.routeOrder.create({
      data: {
        type, contactName, contactPhone, contactEmail,
        address, addressLat: addressLat ?? null, addressLng: addressLng ?? null,
        scheduledAt: new Date(scheduledAt),
        notes: notes ?? null,
        assignedTo: assignedTo ?? null,
        originLocation: originLocation ?? null,
        destLocation: destLocation ?? null,
      },
      include: { employee: { select: { id: true, name: true } } },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}