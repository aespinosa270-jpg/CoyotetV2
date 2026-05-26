import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../bot/_lib/guard";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  const transportistas = await prisma.transportista.findMany({
    orderBy: [{ zona: "asc" }, { nombre: "asc" }],
  });

  return NextResponse.json({ transportistas });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const body = await req.json();

  if (!body.nombre || !body.zona) {
    return NextResponse.json({ error: "nombre y zona requeridos" }, { status: 400 });
  }

  const transportista = await prisma.transportista.create({
    data: {
      nombre: body.nombre.trim(),
      zona: body.zona,
      direccion: body.direccion?.trim() || null,
      telefono: body.telefono?.trim() || null,
      destinos: Array.isArray(body.destinos) ? body.destinos : [],
      notas: body.notas?.trim() || null,
      activo: body.activo ?? true,
    },
  });

  return NextResponse.json({ ok: true, transportista });
}