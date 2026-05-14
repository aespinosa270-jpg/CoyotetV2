/**
 * Helper de auth para endpoints de cron.
 *
 * Verifica el header Authorization: Bearer ${CRON_SECRET}.
 * Si no coincide → 401. Si no hay secret configurado → fail-open (modo dev).
 */
import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/bot/config/env";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/cron/guard" });

/**
 * Verifica que el request venga con el bearer correcto.
 * Retorna NextResponse 401 si falla, null si pasa.
 */
export function requireCronAuth(req: NextRequest): NextResponse | null {
  const env = getEnv();
  const expected = env.CRON_SECRET;

  // Si no hay secret configurado, dejamos pasar (modo dev/staging)
  if (!expected) {
    log.warn(
      {},
      "CRON_SECRET no configurado — endpoints de cron sin protección"
    );
    return null;
  }

  const auth = req.headers.get("authorization");
  if (!auth) {
    return NextResponse.json({ error: "missing authorization" }, { status: 401 });
  }

  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return NextResponse.json(
      { error: "authorization format inválido" },
      { status: 401 }
    );
  }

  const received = match[1].trim();
  if (received !== expected) {
    log.warn({}, "Cron auth con secret incorrecto");
    return NextResponse.json({ error: "invalid secret" }, { status: 401 });
  }

  return null;
}
