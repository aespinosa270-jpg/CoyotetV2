import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const orders = await prisma.routeOrder.findMany({
    orderBy: { scheduledAt: "asc" },
    include: { employee: { select: { id: true, name: true } } },
  });
  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      type, contactName, contactPhone, contactEmail,
      address, addressLat, addressLng,
      scheduledAt, notes,
      employeeId,        // ✅ era assignedTo
      originLocation, destLocation,
      carrier, sucursalNombre,
    } = body;

    if (!type || !contactName || !address || !scheduledAt) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const order = await prisma.routeOrder.create({
      data: {
        type,
        contactName,
        contactPhone:   contactPhone   ?? null,
        contactEmail:   contactEmail   ?? null,
        address,
        addressLat:     addressLat     ?? null,
        addressLng:     addressLng     ?? null,
        scheduledAt:    new Date(scheduledAt),
        notes:          notes          ?? null,
        employeeId:     employeeId     ?? null,  // ✅ era assignedTo
        originLocation: originLocation ?? null,
        destLocation:   destLocation   ?? null,
        carrier:        carrier        ?? null,
        sucursalNombre: sucursalNombre ?? null,
      },
      include: { employee: { select: { id: true, name: true } } },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}