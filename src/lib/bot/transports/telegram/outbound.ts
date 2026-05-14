/**
 * Adapter outbound del transport TELEGRAM.
 *
 * Envía mensajes usando la Bot API:
 *   POST https://api.telegram.org/bot{TOKEN}/sendMessage
 *
 * Para fotos:
 *   POST https://api.telegram.org/bot{TOKEN}/sendPhoto
 *
 * El TOKEN viene del env (TELEGRAM_BOT_TOKEN), generado en @BotFather.
 *
 * Docs: https://core.telegram.org/bots/api#sendmessage
 */
import { getEnv } from "../../config/env";
import { getLogger } from "../../observability/logger";
import type {
  OutgoingMessage,
  DeliveryResult,
} from "../../types/messages";

const log = getLogger({ module: "telegram/outbound" });
const TELEGRAM_API_BASE = "https://api.telegram.org";

/**
 * Envía un OutgoingMessage a Telegram.
 * El `to.id` debe ser el clientId universal con prefix `tg:` (ej. "tg:123456789").
 * Se extrae el chat_id quitando el prefix.
 */
export async function sendToTelegram(
  outgoing: OutgoingMessage,
  fetchImpl: typeof fetch = fetch
): Promise<DeliveryResult> {
  const start = Date.now();
  const env = getEnv();
  const token = env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return {
      status: "failed",
      error: "TELEGRAM_BOT_TOKEN no configurado",
      attempts: 0,
    };
  }

  const chatId = extractChatId(outgoing.to.id);
  if (!chatId) {
    return {
      status: "failed",
      error: `to.id inválido para Telegram: ${outgoing.to.id}`,
      attempts: 0,
    };
  }

  try {
    if (outgoing.type === "text") {
      return await sendText(token, chatId, outgoing.text ?? "", start, fetchImpl);
    }
    if (outgoing.type === "image") {
      return await sendPhoto(
        token,
        chatId,
        outgoing.media?.url ?? "",
        outgoing.media?.caption ?? outgoing.text ?? "",
        start,
        fetchImpl
      );
    }
    // Interactive (botones) en Telegram va por inline keyboards.
    // Por ahora lo enviamos como texto plano con las opciones listadas.
    if (outgoing.type === "interactive") {
      const body = outgoing.interactive?.body ?? "";
      const buttons = outgoing.interactive?.buttons ?? [];
      const fullText =
        body +
        (buttons.length > 0
          ? "\n\n" + buttons.map((b, i) => `${i + 1}. ${b.label}`).join("\n")
          : "");
      return await sendText(token, chatId, fullText, start, fetchImpl);
    }

    return {
      status: "failed",
      error: `tipo de mensaje no soportado: ${outgoing.type}`,
      attempts: 0,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg, chatId }, "sendToTelegram error inesperado");
    return {
      status: "failed",
      error: msg,
      attempts: 1,
      latencyMs: Date.now() - start,
    };
  }
}

// ── Implementaciones ─────────────────────────────────────────────

async function sendText(
  token: string,
  chatId: string,
  text: string,
  start: number,
  fetchImpl: typeof fetch
): Promise<DeliveryResult> {
  const url = `${TELEGRAM_API_BASE}/bot${token}/sendMessage`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });

  return handleResponse(res, start);
}

async function sendPhoto(
  token: string,
  chatId: string,
  photoUrl: string,
  caption: string,
  start: number,
  fetchImpl: typeof fetch
): Promise<DeliveryResult> {
  if (!photoUrl) {
    return {
      status: "failed",
      error: "URL de foto requerida",
      attempts: 0,
    };
  }

  const url = `${TELEGRAM_API_BASE}/bot${token}/sendPhoto`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption,
    }),
  });

  return handleResponse(res, start);
}

async function handleResponse(
  res: Response,
  start: number
): Promise<DeliveryResult> {
  const latencyMs = Date.now() - start;

  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {}
    log.warn({ status: res.status, body }, "Telegram API respondió con error");
    return {
      status: "failed",
      error: `HTTP ${res.status}: ${body.slice(0, 200)}`,
      attempts: 1,
      latencyMs,
    };
  }

  const data = (await res.json()) as {
    ok: boolean;
    result?: { message_id?: number };
  };

  if (!data.ok) {
    return {
      status: "failed",
      error: "Telegram API ok=false",
      attempts: 1,
      latencyMs,
    };
  }

  return {
    status: "sent",
    channelMessageId: data.result?.message_id
      ? String(data.result.message_id)
      : undefined,
    attempts: 1,
    latencyMs,
  };
}

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Extrae el chat_id real de un clientId con prefix "tg:".
 * Si no tiene el prefix, asume que ya es el chat_id puro.
 */
function extractChatId(toId: string): string | null {
  if (!toId) return null;
  if (toId.startsWith("tg:")) return toId.slice(3);
  return toId;
}
