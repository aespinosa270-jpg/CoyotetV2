/**
 * Webhook de Telegram.
 *
 * Telegram envía POST a esta URL con cada update.
 * Flujo:
 *   1. Verificar secret token (si está configurado)
 *   2. Parsear update
 *   3. Convertir a IncomingMessage
 *   4. Llamar orchestrator
 *   5. Enviar respuesta via Telegram Bot API
 *   6. Retornar 200 OK (Telegram reintenta si no recibe 200 rápido)
 *
 * Telegram tiene timeout corto (~60s), pero NO reintenta indefinidamente.
 * Si nuestro endpoint tarda mucho, perdemos el mensaje. Por eso respondemos
 * 200 lo más rápido posible y procesamos sync (no en background) para tener
 * la respuesta lista antes del timeout.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramSecret } from "@/lib/bot/transports/telegram/verify";
import {
  buildIncomingFromTelegram,
  type TelegramUpdate,
} from "@/lib/bot/transports/telegram/inbound";
import { sendToTelegram } from "@/lib/bot/transports/telegram/outbound";
import { processMessage } from "@/lib/bot/core/orchestrator";
import { getRedis } from "@/lib/bot/repositories/redis";
import { isDuplicateMessage } from "@/lib/bot/guards/dedupe";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/webhooks/telegram" });

export async function POST(req: NextRequest) {
  const start = Date.now();

  // 1. Verificar secret token
  if (!verifyTelegramSecret(req)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // 2. Parsear update
  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    log.warn({}, "Update inválido (no JSON)");
    return NextResponse.json({ ok: true }); // 200 para no causar reintento
  }

  // 3. Convertir a IncomingMessage
  const incoming = buildIncomingFromTelegram(update);
  if (!incoming) {
    log.debug({ updateId: update.update_id }, "Update no procesable (skip)");
    return NextResponse.json({ ok: true });
  }

  // 4. Dedupe — Telegram puede reintentar el mismo update
  const redis = getRedis();
  const dedupeKey = `tg_${update.update_id}`;
  if (await isDuplicateMessage(dedupeKey, redis)) {
    log.info({ updateId: update.update_id }, "Update duplicado, skip");
    return NextResponse.json({ ok: true });
  }

  // 5. Procesar con orchestrator
  try {
    const outgoing = await processMessage(incoming);

    log.info(
      {
        updateId: update.update_id,
        from: incoming.from.id,
        type: incoming.type,
        outgoingCount: outgoing.length,
        processingMs: Date.now() - start,
      },
      "Mensaje Telegram procesado"
    );

    // 6. Enviar respuestas a Telegram
    for (const msg of outgoing) {
      const result = await sendToTelegram(msg);
      if (result.status === "failed") {
        log.error(
          { error: result.error, chatId: incoming.from.id },
          "Falló envío de mensaje a Telegram"
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error(
      { err, updateId: update.update_id },
      "Error procesando update de Telegram"
    );
    // Aún retornamos 200 para evitar reintentos infinitos
    return NextResponse.json({ ok: true });
  }
}

/**
 * GET para diagnóstico simple — abrir la URL en browser muestra "Telegram webhook OK".
 * Útil para verificar que el endpoint existe después del deploy.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Telegram webhook endpoint listo. POST aquí desde Telegram.",
  });
}
