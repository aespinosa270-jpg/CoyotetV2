/**
 * Verificación del secret token del webhook de Telegram.
 *
 * Cuando configuras el webhook con `setWebhook?secret_token=XXX`, Telegram
 * incluye ese mismo token en el header `X-Telegram-Bot-Api-Secret-Token`
 * en cada request. Si no coincide, rechazamos.
 *
 * Esto evita que cualquier persona que adivine la URL del webhook pueda
 * enviar updates falsos.
 *
 * Docs: https://core.telegram.org/bots/api#setwebhook
 */
import { getEnv } from "../../config/env";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "telegram/verify" });

const SECRET_HEADER = "x-telegram-bot-api-secret-token";

/**
 * Devuelve true si el request tiene el secret token correcto.
 * Si no hay TELEGRAM_WEBHOOK_SECRET configurado, no verifica (modo dev).
 */
export function verifyTelegramSecret(req: Request): boolean {
  const env = getEnv();
  const expected = env.TELEGRAM_WEBHOOK_SECRET;

  // Si no hay secret configurado, no se valida. Útil para dev local.
  // En producción SIEMPRE configura el secret.
  if (!expected) {
    log.warn(
      {},
      "TELEGRAM_WEBHOOK_SECRET no configurado — webhook acepta cualquier request"
    );
    return true;
  }

  const received = req.headers.get(SECRET_HEADER);
  if (!received) {
    log.warn({}, "Webhook de Telegram sin header secret");
    return false;
  }

  const ok = received === expected;
  if (!ok) log.warn({}, "Webhook de Telegram con secret incorrecto");
  return ok;
}
