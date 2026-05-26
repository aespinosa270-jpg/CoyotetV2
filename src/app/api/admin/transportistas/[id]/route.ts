import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../bot/_lib/guard";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await params;
  const body = await req.json();

  const data: any = {};
  if (typeof body.nombre === "string") data.nombre = body.nombre.trim();
  if (typeof body.zona === "string") data.zona = body.zona;
  if (typeof body.direccion === "string" || body.direccion === null) {
    data.direccion = body.direccion?.trim() || null;
  }
  if (typeof body.telefono === "string" || body.telefono === null) {
    data.telefono = body.telefono?.trim() || null;
  }
  if (Array.isArray(body.destinos)) data.destinos = body.destinos;
  if (typeof body.notas === "string" || body.notas === null) {
    data.notas = body.notas?.trim() || null;
  }
  if (typeof body.activo === "boolean") data.activo = body.activo;

  try {
    const transportista = await prisma.transportista.update({
      where: { id },
      data,
    });
    return NextResponse.json({ ok: true, transportista });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await params;

  try {
    await prisma.transportista.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}