/**
 * POST /api/admin/bot/contactos/send-all
 *
 * Envía la plantilla `bienvenida` a todos los contactos que cumplen UNA de:
 *  - Nunca recibieron plantilla (plantillaEnviada: false)
 *  - Recibieron plantilla PERO no respondieron (plantillaEnviada: true, clienteRespondio: false)
 *
 * Procesa secuencial con delay 300ms para no saturar la API de Meta.
 * Devuelve { ok, total, enviados, fallidos, detalles }.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "../../_lib/guard";
import { prisma } from "@/lib/prisma";
import { sendTemplate, TEMPLATES } from "@/lib/bot/services/meta/template";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/contactos/send-all" });

// Delay entre envíos para no exceder rate limits de Meta
const DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (guard) return guard;

  // Filtro: nunca enviado O (enviado AND no respondió)
  const candidatos = await prisma.contactoOutbound.findMany({
    where: {
      OR: [
        { plantillaEnviada: false },
        { AND: [{ plantillaEnviada: true }, { clienteRespondio: false }] },
      ],
    },
    select: { id: true, phone: true, nombre: true, plantillaEnviada: true },
    orderBy: { createdAt: "asc" },
  });

  if (candidatos.length === 0) {
    return NextResponse.json({
      ok: true,
      total: 0,
      enviados: 0,
      fallidos: 0,
      message: "No hay contactos pendientes",
    });
  }

  log.info(
    { total: candidatos.length },
    "Iniciando envío masivo de plantilla bienvenida"
  );

  let enviados = 0;
  let fallidos = 0;
  const errores: Array<{ phone: string; error: string }> = [];

  for (const contacto of candidatos) {
    try {
      const result = await sendTemplate({
        to: contacto.phone,
        templateName: TEMPLATES.BIENVENIDA.name,
        language: TEMPLATES.BIENVENIDA.language,
      });

      await prisma.contactoOutbound.update({
        where: { id: contacto.id },
        data: {
          plantillaEnviada: result.ok ? true : contacto.plantillaEnviada,
          plantillaEnviadaAt: result.ok ? new Date() : undefined,
          plantillaResponse: result.ok
            ? "SUCCESS"
            : `ERROR: ${result.error}`,
        },
      });

      if (result.ok) {
        enviados++;
      } else {
        fallidos++;
        errores.push({
          phone: contacto.phone,
          error: result.error ?? "unknown",
        });
      }
    } catch (err) {
      fallidos++;
      const msg = err instanceof Error ? err.message : String(err);
      errores.push({ phone: contacto.phone, error: msg });
      log.error({ err, phone: contacto.phone }, "Error en envío individual");
    }

    // Delay entre envíos
    if (candidatos.indexOf(contacto) < candidatos.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  log.info(
    { total: candidatos.length, enviados, fallidos },
    "Envío masivo completado"
  );

  return NextResponse.json({
    ok: true,
    total: candidatos.length,
    enviados,
    fallidos,
    errores: errores.slice(0, 10), // Solo primeros 10 errores
  });
}
