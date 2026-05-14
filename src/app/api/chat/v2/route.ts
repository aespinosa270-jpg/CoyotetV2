/**
 * Endpoint público del chat web del bot v2.
 *
 * POST /api/chat/v2
 * Body: { sessionId: string, message: string, clientName?: string }
 * Response: { messages: [{ type, text }, ...] }
 *
 * Aplica rate limiting básico por IP (anti-abuso del endpoint público).
 *
 * NO requiere auth (es para visitantes anónimos). Para protegerlo de bots
 * malintencionados:
 *   1. Rate limit: 10 mensajes/minuto por sessionId
 *   2. Validación estricta del payload
 *   3. Logs detallados para detectar patrones
 */
import { NextRequest, NextResponse } from "next/server";
import {
  buildIncomingFromWeb,
  validateWebPayload,
} from "@/lib/bot/transports/web/inbound";
import { buildWebResponse } from "@/lib/bot/transports/web/outbound";
import { processMessage } from "@/lib/bot/core/orchestrator";
import { getRedis } from "@/lib/bot/repositories/redis";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/chat/v2" });

// Rate limit: 10 mensajes por sessionId por minuto
const RATE_LIMIT_PER_MIN = 10;
const RATE_LIMIT_WINDOW_SEC = 60;

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // 1. Parsear y validar
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const validationError = validateWebPayload(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { sessionId } = payload;

  // 2. Rate limit por sessionId
  const allowed = await checkRateLimit(sessionId);
  if (!allowed) {
    log.warn({ sessionId }, "Rate limit excedido para sesión web");
    return NextResponse.json(
      { error: "Demasiados mensajes. Por favor espera un momento." },
      { status: 429 }
    );
  }

  // 3. Construir IncomingMessage y procesar
  const requestId = `web_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const incoming = buildIncomingFromWeb(payload, requestId);

  try {
    const outgoing = await processMessage(incoming);
    const response = buildWebResponse(outgoing);

    log.info(
      {
        sessionId,
        requestId,
        latencyMs: Date.now() - startTime,
        outgoingCount: outgoing.length,
      },
      "Mensaje web procesado"
    );

    return NextResponse.json(response);
  } catch (err) {
    log.error({ err, sessionId, requestId }, "Error procesando mensaje web");
    return NextResponse.json(
      {
        messages: [
          {
            type: "text",
            text: "🐺 Tuvimos un momento de tropiezo. ¿Puede repetir su mensaje?",
          },
        ],
      },
      { status: 200 } // 200 con mensaje de error: el widget lo muestra normal
    );
  }
}

// ── Rate limiting ─────────────────────────────────────────────────

async function checkRateLimit(sessionId: string): Promise<boolean> {
  const redis = getRedis();
  const key = `v2:ratelimit:web:${sessionId}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      // primera vez, setear TTL
      await redis.expire(key, RATE_LIMIT_WINDOW_SEC);
    }
    return count <= RATE_LIMIT_PER_MIN;
  } catch (err) {
    log.warn({ err, sessionId }, "Rate limit check falló — permitiendo (fail-open)");
    return true;
  }
}
