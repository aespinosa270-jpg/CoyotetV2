/**
 * Endpoint: limpiar memoria + objeciones + resumen de UN cliente.
 *
 * Útil para debugging: si la memoria de un cliente acumuló basura o un hecho
 * falso, Jack puede resetearlo desde el dashboard sin tocar Redis manualmente.
 *
 * NO elimina el perfil base ni el historial — solo la "inteligencia" que se
 * acumula encima. El bot volverá a aprender desde cero con ese cliente.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRedis } from "@/lib/bot/repositories/redis";
import { requireAdmin } from "../_lib/guard";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/admin/bot/clear-memoria" });

const bodySchema = z.object({
  phone: z.string().min(8),
  clearMemoria: z.boolean().default(true),
  clearObjeciones: z.boolean().default(true),
  clearResumen: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const redis = getRedis();
  const { phone, clearMemoria, clearObjeciones, clearResumen } = body;

  const cleared: string[] = [];

  try {
    if (clearMemoria) {
      await redis.del(`v2:memoria:${phone}`);
      cleared.push("memoria");
    }
    if (clearResumen) {
      await redis.del(`v2:resumen:${phone}`);
      cleared.push("resumen");
    }
    if (clearObjeciones) {
      // No borramos el perfil — solo reseteamos vectorObjeciones a {}
      const perfil = await redis.get<any>(`v2:cliente:${phone}`);
      if (perfil) {
        const reset = {
          ...perfil,
          vectorObjeciones: {},
          objecionesComunes: [],
        };
        await redis.set(`v2:cliente:${phone}`, reset);
        cleared.push("objeciones");
      }
    }

    log.info({ phone, cleared }, "Inteligencia del cliente reseteada");
    return NextResponse.json({ ok: true, cleared });
  } catch (err) {
    log.error({ err, phone }, "Error limpiando memoria");
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
