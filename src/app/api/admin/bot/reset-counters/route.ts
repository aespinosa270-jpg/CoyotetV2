/**
 * POST /api/admin/bot/reset-counters
 *
 * Resetea contadores de un cliente: hallucinations, reask consent, etc.
 * Útil cuando un cliente quedó atascado en loop de retries.
 *
 * Body: { phone: "527299935444" }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_lib/guard";
import { getRedis } from "@/lib/bot/repositories/redis";
import { resetHallucinationCount } from "@/lib/bot/domain/escalation/detector";

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const body = await req.json();
    const phone = body.phone?.replace(/\D/g, "") || "";

    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { error: "phone inválido (mínimo 10 dígitos)" },
        { status: 400 }
      );
    }

    const redis = getRedis();

    // 1. Reset hallucination counter
    await resetHallucinationCount(phone, redis);

    // 2. Reset reask counter (consent loop)
    try {
      await redis.del(`v2:consent_reask:${phone}`);
    } catch {}

    return NextResponse.json({
      ok: true,
      phone,
      message: "Contadores reseteados. El cliente puede volver a interactuar con el bot normalmente.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}