// src/app/api/admin/route-orders/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// PATCH: actualizar status o reasignar chofer
export async function PATCH(
  req: Request, 
  { params }: { params: Promise<{ id: string }> } // 🐺 1. Promesa aquí
) {
  try {
    const { id } = await params; // 🐺 2. Desenvolvemos aquí
    const body = await req.json();
    
    const order = await prisma.routeOrder.update({
      where: { id: id }, // 🐺 3. Usamos la variable limpia
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
export async function DELETE(
  _: Request, 
  { params }: { params: Promise<{ id: string }> } // 🐺 4. Promesa también aquí
) {
  try {
    const { id } = await params; // 🐺 5. Desenvolvemos aquí
    
    await prisma.routeOrder.update({
      where: { id: id }, // 🐺 6. Usamos la variable limpia
      data: { status: "CANCELADA" },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}