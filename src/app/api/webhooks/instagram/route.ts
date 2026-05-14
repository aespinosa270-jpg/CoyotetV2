/**
 * Webhook de Instagram.
 *
 * GET:  Meta envía challenge para verificar la URL del webhook.
 *       Respondemos con el challenge si el verify_token coincide.
 *
 * POST: Cada mensaje/evento de IG llega como POST con HMAC signature.
 *       Validamos, parseamos, procesamos cada mensaje.
 *
 * Igual que Telegram, respondemos 200 lo más rápido posible aunque haya
 * errores internos, para que Meta no reintente indefinidamente.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  verifyInstagramSignature,
  handleVerifyChallenge,
} from "@/lib/bot/transports/instagram/verify";
import {
  buildIncomingFromInstagram,
  type InstagramWebhookPayload,
} from "@/lib/bot/transports/instagram/inbound";
import { sendToInstagram } from "@/lib/bot/transports/instagram/outbound";
import { processMessage } from "@/lib/bot/core/orchestrator";
import { getRedis } from "@/lib/bot/repositories/redis";
import { isDuplicateMessage } from "@/lib/bot/guards/dedupe";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/webhooks/instagram" });

// ── GET: verify challenge ────────────────────────────────────────

export async function GET(req: NextRequest) {
  const result = handleVerifyChallenge(req.nextUrl.searchParams);

  if (!result.ok) {
    log.warn({ reason: result.reason }, "Verify challenge falló");
    return new NextResponse(result.reason, { status: 403 });
  }

  log.info({}, "Verify challenge OK — devolviendo challenge a Meta");
  // Meta espera el challenge como texto plano, no JSON
  return new NextResponse(result.challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

// ── POST: mensajes ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const start = Date.now();

  // 1. Leer raw body PRIMERO (lo necesitamos para verificar signature)
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ ok: true }); // 200 para no causar reintento
  }

  // 2. Verificar signature
  const signatureHeader = req.headers.get("x-hub-signature-256");
  if (!verifyInstagramSignature(rawBody, signatureHeader)) {
    log.warn({}, "Webhook Instagram con signature inválida — rechazando");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // 3. Parsear el payload
  let payload: InstagramWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    log.warn({}, "Payload Instagram inválido (no JSON)");
    return NextResponse.json({ ok: true });
  }

  // 4. Convertir a IncomingMessage[]
  const incomings = buildIncomingFromInstagram(payload);
  if (incomings.length === 0) {
    return NextResponse.json({ ok: true });
  }

  // 5. Procesar cada mensaje
  const redis = getRedis();

  for (const incoming of incomings) {
    // Dedupe por mid
    if (await isDuplicateMessage(incoming.id, redis)) {
      log.info({ id: incoming.id }, "Mensaje Instagram duplicado, skip");
      continue;
    }

    try {
      const outgoing = await processMessage(incoming);

      log.info(
        {
          from: incoming.from.id,
          type: incoming.type,
          outgoingCount: outgoing.length,
          processingMs: Date.now() - start,
        },
        "Mensaje Instagram procesado"
      );

      // 6. Enviar respuestas a Instagram
      for (const msg of outgoing) {
        const result = await sendToInstagram(msg);
        if (result.status === "failed") {
          log.error(
            { error: result.error, recipient: incoming.from.id },
            "Falló envío a Instagram"
          );
        }
      }
    } catch (err) {
      log.error(
        { err, id: incoming.id },
        "Error procesando mensaje Instagram (continuando con los demás)"
      );
    }
  }

  return NextResponse.json({ ok: true });
}
