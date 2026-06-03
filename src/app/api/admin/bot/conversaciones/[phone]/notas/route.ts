/**
 * GET  /api/admin/bot/conversaciones/[phone]/notas  -> { ok, nota }
 * POST /api/admin/bot/conversaciones/[phone]/notas  -> guarda { nota }
 *
 * Nota interna privada del agente sobre el cliente. NO se envia al cliente.
 * Guarda un string en Redis key v2:notas:{phone}. No toca el perfil.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../_lib/guard";
import { getRedis } from "@/lib/bot/repositories/redis";
import { keys } from "@/lib/bot/repositories/keys";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/conversaciones/notas" });

const MAX_NOTA = 4000;

function validarPhone(phone: string): boolean {
  return !!phone && (/^\d{10,15}$/.test(phone.replace(/\D/g, "")) || phone.startsWith("web:"));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { phone: phoneEncoded } = await params;
  const phone = decodeURIComponent(phoneEncoded);
  if (!validarPhone(phone)) return NextResponse.json({ error: "phone invalido" }, { status: 400 });

  try {
    const redis = getRedis();
    const raw = await redis.get<string>(keys.notas(phone));
    return NextResponse.json({ ok: true, nota: typeof raw === "string" ? raw : "" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err, phone }, "Error leyendo nota");
    return NextResponse.json({ error: "notas read failed", details: msg }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { phone: phoneEncoded } = await params;
  const phone = decodeURIComponent(phoneEncoded);
  if (!validarPhone(phone)) return NextResponse.json({ error: "phone invalido" }, { status: 400 });

  let body: { nota?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "body invalido" }, { status: 400 }); }

  const nota = (body.nota || "").slice(0, MAX_NOTA);

  try {
    const redis = getRedis();
    const key = keys.notas(phone);
    if (nota.trim().length > 0) await redis.set(key, nota);
    else await redis.del(key);
    return NextResponse.json({ ok: true, nota });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err, phone }, "Error guardando nota");
    return NextResponse.json({ error: "notas write failed", details: msg }, { status: 500 });
  }
}
