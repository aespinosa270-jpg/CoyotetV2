/**
 * GET /api/admin/bot/migrar-plantillas
 *
 * Migracion de uso unico: recorre los contactos que YA recibieron plantilla
 * (plantillaEnviadaAt no nulo) e inserta en el historial de su chat un mensaje
 * "Plantilla enviada" con la fecha real, para que sea visible en Conversaciones.
 *
 * Idempotente: si el historial ya tiene la marca de migracion, lo salta.
 * Abrir en el navegador (requiere sesion admin). Soporta ?dryRun=1.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_lib/guard";
import { prisma } from "@/lib/prisma";
import { getHistorial, appendMensaje } from "@/lib/bot/repositories/conversation-repo";

export const maxDuration = 60;

const MARCA = "[Plantilla enviada:";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  // Contactos que ya recibieron plantilla
  const contactos = await prisma.contactoOutbound.findMany({
    where: { plantillaEnviadaAt: { not: null } },
    select: { phone: true, plantillaEnviadaAt: true, plantillaResponse: true },
    orderBy: { plantillaEnviadaAt: "asc" },
  });

  let migrados = 0;
  let yaTenian = 0;
  let sinHistorial = 0;
  const detalle: string[] = [];

  for (const c of contactos) {
    if (!c.phone) continue;
    try {
      const hist = await getHistorial(c.phone);

      // Si ya tiene una marca de plantilla, no duplicar
      const yaMarcado = hist.some((m) => typeof m.content === "string" && m.content.includes(MARCA));
      if (yaMarcado) { yaTenian++; continue; }

      if (hist.length === 0) {
        // Sin historial previo: igual dejamos la marca para que se vea que se contacto
        sinHistorial++;
      }

      if (!dryRun) {
        await appendMensaje(c.phone, {
          role: "assistant",
          content: `📋 [Plantilla enviada] ${c.plantillaEnviadaAt ? new Date(c.plantillaEnviadaAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : ""}`,
          timestamp: c.plantillaEnviadaAt ? new Date(c.plantillaEnviadaAt).toISOString() : new Date().toISOString(),
        }).catch(() => {});
      }
      migrados++;
      if (detalle.length < 10) detalle.push(c.phone);
    } catch {
      // saltar errores individuales
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    totalContactos: contactos.length,
    migrados,
    yaTenian,
    sinHistorialPrevio: sinHistorial,
    ejemplos: detalle,
    mensaje: dryRun
      ? "Modo prueba: nada escrito. Quita ?dryRun=1 para aplicar."
      : "Migracion aplicada. Revisa las conversaciones.",
  });
}
