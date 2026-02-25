// src/app/api/admin/route-orders/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// PATCH: actualizar status o reasignar chofer
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const order = await prisma.routeOrder.update({
      where: { id: params.id },
      data: body,
      include: { employee: { select: { id: true, name: true } } },
    });
    return NextResponse.json(order);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE: cancelar orden
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.routeOrder.update({
    where: { id: params.id },
    data: { status: "CANCELADA" },
  });
  return NextResponse.json({ ok: true });
}