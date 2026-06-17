/**
 * POST /api/admin/bot/conversaciones/[phone]/archivar
 *
 * Archiva (o desarchiva) una conversacion. Reversible.
 * Body: { archivada: boolean } -> si se omite, togglea.
 * Guarda en Redis v2:archivada:{phone}. NO toca el historial.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../_lib/guard";
import { getRedis } from "@/lib/bot/repositories/redis";
import { keys } from "@/lib/bot/repositories/keys";
import { getLogger } from "@/lib/bot/observability/logger";
const log = getLogger({ module: "api/conversaciones/archivar" });
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
    const key = keys.archivada(phone);
    let body: { archivada?: boolean } = {};
    try { body = await req.json(); } catch { body = {}; }
    let nuevoEstado: boolean;
    if (typeof body.archivada === "boolean") {
      nuevoEstado = body.archivada;
    } else {
      const actual = await redis.get(key);
      nuevoEstado = !actual;
    }
    if (nuevoEstado) {
      await redis.set(key, new Date().toISOString());
    } else {
      await redis.del(key);
    }
    return NextResponse.json({ ok: true, archivada: nuevoEstado });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err, phone }, "Error en archivar");
    return NextResponse.json({ error: "archivar failed", details: msg }, { status: 500 });
  }
}
