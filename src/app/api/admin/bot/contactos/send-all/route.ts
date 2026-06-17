/**
 * POST /api/admin/bot/contactos/send-all
 *
 * Campana de plantilla a TODA la cartera (contactoOutbound), por TANDAS.
 * El front llama repetidamente con offset creciente hasta done=true.
 * Esto evita el timeout de Vercel (60s) y hace goteo seguro para no quemar
 * el numero de WhatsApp.
 *
 * Body: { templateKey, offset?, batchSize? }
 * Respuesta: { ok, done, offset, nextOffset, total, batchEnviados, batchFallidos, errores }
 *
 * NOTA: manda a TODA la cartera, reenviando aunque ya haya recibido antes.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "../../_lib/guard";
import { prisma } from "@/lib/prisma";
import { sendTemplate, TEMPLATES } from "@/lib/bot/services/meta/template";
import { appendMensaje } from "@/lib/bot/repositories/conversation-repo";
import { getLogger } from "@/lib/bot/observability/logger";

export const maxDuration = 60;

const log = getLogger({ module: "api/contactos/send-all" });

const DEFAULT_BATCH = 25;
const DELAY_MS = 1200; // goteo entre cada mensaje (mas seguro para Meta)

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (guard) return guard;

  let body: any = {};
  try { body = await req.json(); } catch {}

  let templateKey: "BIENVENIDA" | "OFERTA_REACTIVACION" =
    body?.templateKey === "OFERTA_REACTIVACION" ? "OFERTA_REACTIVACION" : "BIENVENIDA";
  const plantilla = TEMPLATES[templateKey];

  const offset = Math.max(0, parseInt(String(body?.offset ?? 0), 10) || 0);
  const batchSize = Math.min(50, Math.max(1, parseInt(String(body?.batchSize ?? DEFAULT_BATCH), 10) || DEFAULT_BATCH));

  // Total de la cartera (toda, salvo opt-out). orden estable por createdAt.
  const total = await prisma.contactoOutbound.count();

  // Tanda actual
  const tanda = await prisma.contactoOutbound.findMany({
    select: { id: true, phone: true, nombre: true, plantillaEnviada: true },
    orderBy: { createdAt: "asc" },
    skip: offset,
    take: batchSize,
  });

  let batchEnviados = 0;
  let batchFallidos = 0;
  const errores: Array<{ phone: string; error: string }> = [];

  for (let i = 0; i < tanda.length; i++) {
    const contacto = tanda[i];
    try {
      const result = await sendTemplate({
        to: contacto.phone,
        templateName: plantilla.name,
        language: plantilla.language,
        headerImageUrl: "headerImageUrl" in plantilla ? (plantilla as any).headerImageUrl : undefined,
      });

      await prisma.contactoOutbound.update({
        where: { id: contacto.id },
        data: {
          plantillaEnviada: result.ok ? true : contacto.plantillaEnviada,
          plantillaEnviadaAt: result.ok ? new Date() : undefined,
          plantillaResponse: result.ok ? "SUCCESS" : `ERROR: ${result.error}`,
        },
      }).catch(() => {});

      // Guardar la plantilla en el historial del chat para que sea visible en Conversaciones
      if (result.ok) {
        await appendMensaje(contacto.phone, {
          role: "assistant",
          content: `📋 [Plantilla enviada: ${plantilla.name}]`,
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      }

      if (result.ok) batchEnviados++;
      else { batchFallidos++; errores.push({ phone: contacto.phone, error: result.error ?? "unknown" }); }
    } catch (err) {
      batchFallidos++;
      const msg = err instanceof Error ? err.message : String(err);
      errores.push({ phone: contacto.phone, error: msg });
      log.error({ err, phone: contacto.phone }, "Error en envio individual");
    }

    if (i < tanda.length - 1) await sleep(DELAY_MS);
  }

  const nextOffset = offset + tanda.length;
  const done = nextOffset >= total || tanda.length === 0;

  log.info({ offset, nextOffset, total, batchEnviados, batchFallidos, done }, "Tanda de campana procesada");

  return NextResponse.json({
    ok: true,
    done,
    offset,
    nextOffset,
    total,
    batchEnviados,
    batchFallidos,
    errores: errores.slice(0, 5),
  });
}
