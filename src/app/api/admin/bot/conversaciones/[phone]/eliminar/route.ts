/**
 * POST /api/admin/bot/conversaciones/[phone]/eliminar
 *
 * "Elimina" una conversacion de la vista (esconde permanente). NO es
 * destructivo: el historial sigue en Redis por si se necesita recuperar.
 * Body: { eliminada: boolean } -> si se omite, togglea.
 * Guarda en Redis v2:eliminada:{phone}.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../_lib/guard";
import { getRedis } from "@/lib/bot/repositories/redis";
import { keys } from "@/lib/bot/repositories/keys";
import { getLogger } from "@/lib/bot/observability/logger";
const log = getLogger({ module: "api/conversaciones/eliminar" });
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
    const key = keys.eliminada(phone);
    let body: { eliminada?: boolean } = {};
    try { body = await req.json(); } catch { body = {}; }
    let nuevoEstado: boolean;
    if (typeof body.eliminada === "boolean") {
      nuevoEstado = body.eliminada;
    } else {
      const actual = await redis.get(key);
      nuevoEstado = !actual;
    }
    if (nuevoEstado) {
      await redis.set(key, new Date().toISOString());
    } else {
      await redis.del(key);
    }
    return NextResponse.json({ ok: true, eliminada: nuevoEstado });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err, phone }, "Error en eliminar");
    return NextResponse.json({ error: "eliminar failed", details: msg }, { status: 500 });
  }
}
