/**
 * Endpoints de contactos outbound:
 *   POST /api/admin/bot/contactos    → crear contacto
 *   GET  /api/admin/bot/contactos    → listar
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_lib/guard";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const phone = String(body.phone ?? "").replace(/\D/g, "");
  if (!/^\d{10,15}$/.test(phone)) {
    return NextResponse.json(
      { error: "Phone inválido (E.164 sin +)" },
      { status: 400 }
    );
  }

  const session = await auth();
  const agregadoPor = session?.user?.email ?? "admin";

  try {
    // Si ya existe, actualizar datos
    const existing = await prisma.contactoOutbound.findUnique({
      where: { phone },
    });

    if (existing) {
      const updated = await prisma.contactoOutbound.update({
        where: { phone },
        data: {
          nombre: body.nombre ?? existing.nombre,
          empresa: body.empresa ?? existing.empresa,
          notas: body.notas ?? existing.notas,
        },
      });
      return NextResponse.json({ ok: true, contacto: updated, updated: true });
    }

    const contacto = await prisma.contactoOutbound.create({
      data: {
        phone,
        nombre: body.nombre,
        empresa: body.empresa,
        notas: body.notas,
        agregadoPor,
      },
    });
    return NextResponse.json({ ok: true, contacto });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  const contactos = await prisma.contactoOutbound.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(contactos);
}
