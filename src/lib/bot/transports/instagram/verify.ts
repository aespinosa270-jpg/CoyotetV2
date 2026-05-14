/**
 * Verificación de signature del webhook de Instagram (Meta).
 *
 * Meta firma cada webhook con HMAC-SHA256 usando el APP_SECRET. La firma
 * viene en el header `x-hub-signature-256` con formato "sha256={hex}".
 *
 * Si la signature no es válida, rechazamos el request (probable spoofing
 * o request directo a la URL).
 *
 * Adicionalmente, GET con `hub.verify_token` se usa para que Meta valide
 * que la URL del webhook responde — eso lo manejamos en el route handler.
 *
 * Docs: https://developers.facebook.com/docs/messenger-platform/webhook#security
 */
import crypto from "crypto";
import { getEnv } from "../../config/env";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "instagram/verify" });

const SIGNATURE_HEADER = "x-hub-signature-256";

/**
 * Valida la signature HMAC del payload.
 * Si INSTAGRAM_APP_SECRET no está configurado, no se valida (modo dev).
 *
 * IMPORTANTE: hay que pasar el RAW body como string, no el JSON parseado.
 * Meta firma sobre los bytes exactos del body, así que cualquier reformateo
 * (whitespace, orden de keys, etc) rompe la firma.
 */
export function verifyInstagramSignature(
  rawBody: string,
  headerSignature: string | null
): boolean {
  const env = getEnv();
  const appSecret = env.INSTAGRAM_APP_SECRET;

  if (!appSecret) {
    log.warn(
      {},
      "INSTAGRAM_APP_SECRET no configurado — webhook acepta cualquier request"
    );
    return true;
  }

  if (!headerSignature || !headerSignature.startsWith("sha256=")) {
    log.warn({}, "Webhook de Instagram sin header de signature");
    return false;
  }

  const expectedHash = headerSignature.slice(7); // quitar "sha256="

  const computedHash = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  // Comparación constant-time para evitar timing attacks
  const expectedBuf = Buffer.from(expectedHash, "hex");
  const computedBuf = Buffer.from(computedHash, "hex");

  if (expectedBuf.length !== computedBuf.length) {
    log.warn({}, "Signature length mismatch");
    return false;
  }

  const ok = crypto.timingSafeEqual(expectedBuf, computedBuf);
  if (!ok) log.warn({}, "Webhook de Instagram con signature incorrecta");
  return ok;
}

/**
 * Valida el challenge GET que Meta envía para confirmar la URL del webhook.
 *
 * Cuando configuras el webhook en Meta Business, Meta hace GET con:
 *   ?hub.mode=subscribe&hub.verify_token=XXX&hub.challenge=YYY
 *
 * Si nuestro INSTAGRAM_VERIFY_TOKEN coincide con XXX, devolvemos YYY como
 * texto plano. Meta confirma con eso que la URL es válida.
 */
export function handleVerifyChallenge(
  searchParams: URLSearchParams
): { ok: true; challenge: string } | { ok: false; reason: string } {
  const env = getEnv();
  const expectedToken = env.INSTAGRAM_VERIFY_TOKEN;

  if (!expectedToken) {
    return { ok: false, reason: "INSTAGRAM_VERIFY_TOKEN no configurado" };
  }

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe") {
    return { ok: false, reason: `hub.mode inválido: ${mode}` };
  }
  if (token !== expectedToken) {
    return { ok: false, reason: "verify_token no coincide" };
  }
  if (!challenge) {
    return { ok: false, reason: "challenge ausente" };
  }
  return { ok: true, challenge };
}
