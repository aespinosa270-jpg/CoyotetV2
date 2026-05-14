/**
 * POST /api/admin/bot/contactos/[id]/send
 *
 * Envía la plantilla `bienvenida` al contacto y actualiza su estado.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "../../../_lib/guard";
import { prisma } from "@/lib/prisma";
import { sendTemplate, TEMPLATES } from "@/lib/bot/services/meta/template";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await params;

  const contacto = await prisma.contactoOutbound.findUnique({ where: { id } });
  if (!contacto) {
    return NextResponse.json({ error: "Contacto no existe" }, { status: 404 });
  }

  if (contacto.plantillaEnviada) {
    return NextResponse.json(
      { error: "Plantilla ya fue enviada a este contacto" },
      { status: 400 }
    );
  }

  const result = await sendTemplate({
    to: contacto.phone,
    templateName: TEMPLATES.BIENVENIDA.name,
    language: TEMPLATES.BIENVENIDA.language,
  });

  // Actualizar estado del contacto
  await prisma.contactoOutbound.update({
    where: { id },
    data: {
      plantillaEnviada: result.ok,
      plantillaEnviadaAt: result.ok ? new Date() : null,
      plantillaResponse: result.ok ? "SUCCESS" : `ERROR: ${result.error}`,
    },
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, errorCode: result.errorCode },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, messageId: result.messageId });
}
