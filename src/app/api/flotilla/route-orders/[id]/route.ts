// src/app/api/flotilla/route-orders/[id]/route.ts
// ✅ Alineado al schema real: PENDIENTE → ASIGNADA → EN_CAMINO → COMPLETADA | CANCELADA
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "../../../../../auth";

export const GET = auth(
  async (
    req: Request,
    { params }: { params: Promise<{ id: string }> } // 🐺 1. Declaramos la promesa
  ) => {
    const { id } = await params; // 🐺 2. Desenvolvemos el ID

    const session = (req as any).auth;
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orden = await prisma.routeOrder.findUnique({
      where: { id: id }, // 🐺 3. Usamos la variable limpia
      include: { items: true, employee: true },
    });

    if (!orden)
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    return NextResponse.json(orden);
  }
);

// Máquina de estados alineada al schema real
const TRANSICIONES: Record<string, string[]> = {
  PENDIENTE: ["ASIGNADA"],
  ASIGNADA:  ["EN_CAMINO"],
  EN_CAMINO: ["COMPLETADA", "CANCELADA"],
};

export const PATCH = auth(
  async (
    req: Request,
    { params }: { params: Promise<{ id: string }> } // 🐺 4. Declaramos la promesa en el PATCH
  ) => {
    const { id } = await params; // 🐺 5. Desenvolvemos el ID

    const session = (req as any).auth;
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { status } = body;

    const orden = await prisma.routeOrder.findUnique({ where: { id: id } }); // 🐺 6. ID limpio
    if (!orden) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const permitidos = TRANSICIONES[orden.status] ?? [];
    if (status && !permitidos.includes(status)) {
      return NextResponse.json(
        { error: `Transición inválida: ${orden.status} → ${status}` },
        { status: 400 }
      );
    }

    const updated = await prisma.routeOrder.update({
      where: { id: id }, // 🐺 7. ID limpio para actualizar
      data: body,
      include: { items: true },
    });

    return NextResponse.json(updated);
  }
);