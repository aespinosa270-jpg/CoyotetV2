/**
 * services/meta/verify.ts
 *
 * Manejo del handshake GET de verificación que Meta envía
 * cuando registras o actualizas un webhook.
 *
 * Meta envía:
 *   GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=XXX&hub.challenge=YYY
 *
 * Nosotros debemos responder con hub.challenge si el token es correcto.
 */

import { getEnv } from "../../config/env";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "meta/verify" });

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export interface VerifyParams {
  mode: string | null;
  token: string | null;
  challenge: string | null;
}

export type VerifyResult =
  | { ok: true; challenge: string }
  | { ok: false; reason: string };

// ─── Verificación ──────────────────────────────────────────────────────────────

/**
 * Verifica el handshake de Meta y devuelve el challenge si es válido.
 *
 * @example
 * // En route.ts (thin):
 * export async function GET(req: Request) {
 *   const { searchParams } = new URL(req.url);
 *   const result = verifyWebhook({
 *     mode:      searchParams.get('hub.mode'),
 *     token:     searchParams.get('hub.verify_token'),
 *     challenge: searchParams.get('hub.challenge'),
 *   });
 *   if (result.ok) return new NextResponse(result.challenge, { status: 200 });
 *   return new NextResponse('Forbidden', { status: 403 });
 * }
 */
export function verifyWebhook(params: VerifyParams): VerifyResult {
  const { mode, token, challenge } = params;

  if (mode !== "subscribe") {
    log.warn({ mode }, "Verificación Meta fallida: hub.mode incorrecto");
    return { ok: false, reason: `hub.mode inválido: "${mode}"` };
  }

  if (!challenge) {
    log.warn("Verificación Meta fallida: sin hub.challenge");
    return { ok: false, reason: "hub.challenge ausente" };
  }

  const env = getEnv();
  const expectedToken = env.WHATSAPP_VERIFY_TOKEN;

  if (token !== expectedToken) {
    log.warn({ receivedToken: token ? "[PRESENT]" : "[MISSING]" }, "Verificación Meta fallida: token incorrecto");
    return { ok: false, reason: "Token de verificación incorrecto" };
  }

  log.info("Verificación Meta exitosa");
  return { ok: true, challenge };
}

/**
 * Extrae los parámetros de verificación de un objeto URL search params.
 * Conveniencia para no escribir los strings de hub.* en múltiples lugares.
 */
export function extractVerifyParams(searchParams: URLSearchParams): VerifyParams {
  return {
    mode:      searchParams.get("hub.mode"),
    token:     searchParams.get("hub.verify_token"),
    challenge: searchParams.get("hub.challenge"),
  };
}
