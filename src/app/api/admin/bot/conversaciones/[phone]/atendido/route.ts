/**
 * POST /api/admin/bot/conversaciones/[phone]/atendido
 *
 * Marca (o desmarca) una conversacion como atendida por un humano.
 * Body: { atendido: boolean }  -> si se omite, togglea.
 * Guarda en Redis key v2:atendido:{phone}. No toca el perfil.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../_lib/guard";
import { getRedis } from "@/lib/bot/repositories/redis";
import { keys } from "@/lib/bot/repositories/keys";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/conversaciones/atendido" });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { phone: phoneEncoded } = await params;
  const phone = decodeURIComponent(phoneEncoded);

  if (!phone || (!/^\d{10,15}$/.test(phone.replace(/\D/g, "")) && !phone.startsWith("web:"))) {
    return NextResponse.json({ error: "phone invalido" }, { status: 400 });
  }

  try {
    const redis = getRedis();
    const key = keys.atendido(phone);

    let body: { atendido?: boolean } = {};
    try { body = await req.json(); } catch { body = {}; }

    let nuevoEstado: boolean;
    if (typeof body.atendido === "boolean") {
      nuevoEstado = body.atendido;
    } else {
      const actual = await redis.get(key);
      nuevoEstado = !actual;
    }

    if (nuevoEstado) {
      await redis.set(key, new Date().toISOString());
    } else {
      await redis.del(key);
    }

    return NextResponse.json({ ok: true, atendido: nuevoEstado });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err, phone }, "Error en atendido");
    return NextResponse.json({ error: "atendido failed", details: msg }, { status: 500 });
  }
}
