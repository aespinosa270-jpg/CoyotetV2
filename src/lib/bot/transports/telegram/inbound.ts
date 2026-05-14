/**
 * Adapter inbound del transport TELEGRAM.
 *
 * Telegram envía "Updates" al webhook. Cada update puede ser:
 *   - message (mensaje nuevo de un chat)
 *   - edited_message (editaron uno previo — lo ignoramos)
 *   - callback_query (click en un botón inline — futuro)
 *
 * Solo procesamos `message` por ahora. El mensaje puede contener:
 *   - text: texto
 *   - photo: array de fotos en varias resoluciones (tomamos la mayor)
 *   - voice / audio / video / document: futuro
 *
 * Identidad del cliente: `tg:{chat_id}`. El chat_id es estable por persona.
 *
 * Docs: https://core.telegram.org/bots/api#update
 */
import type { IncomingMessage } from "../../types/messages";

// ── Tipos de Telegram (subset que usamos) ─────────────────────────

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  from?: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  chat: {
    id: number;
    type: "private" | "group" | "supergroup" | "channel";
    title?: string;
  };
  date: number; // unix timestamp en segundos
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  voice?: { file_id: string; mime_type?: string };
  audio?: { file_id: string; mime_type?: string };
  video?: { file_id: string; mime_type?: string };
  document?: { file_id: string; mime_type?: string };
  sticker?: { file_id: string };
  location?: { latitude: number; longitude: number };
}

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramCallbackQuery {
  id: string;
  from: { id: number; first_name?: string; username?: string };
  message?: TelegramMessage;
  data?: string;
}

// ── Conversión ────────────────────────────────────────────────────

/**
 * Convierte un Update de Telegram a IncomingMessage o null si no se procesa.
 * No procesa: edited_message, channel posts, mensajes de grupos.
 */
export function buildIncomingFromTelegram(
  update: TelegramUpdate
): IncomingMessage | null {
  // 1. Callback queries (botones inline) — TODO en fase futura
  if (update.callback_query) {
    return null;
  }

  // 2. Solo procesamos mensajes nuevos (no edits)
  const msg = update.message;
  if (!msg) return null;

  // 3. Solo chats privados — no grupos ni canales
  if (msg.chat.type !== "private") return null;

  const chatId = String(msg.chat.id);
  const clientId = `tg:${chatId}`;
  const displayName = buildDisplayName(msg.from);

  const base = {
    id: `tg_${update.update_id}`,
    channel: "telegram" as const,
    channelMessageId: String(msg.message_id),
    from: {
      id: clientId,
      displayName,
    },
    to: { id: "coyote_bot_telegram" },
    receivedAt: new Date(msg.date * 1000),
    raw: update,
  };

  // 4. Texto
  if (msg.text) {
    return {
      ...base,
      type: "text",
      text: msg.text,
    };
  }

  // 5. Foto — tomar la versión MÁS GRANDE del array
  if (msg.photo && msg.photo.length > 0) {
    const largest = [...msg.photo].sort(
      (a, b) => b.width * b.height - a.width * a.height
    )[0];
    return {
      ...base,
      type: "image",
      media: {
        nativeId: largest.file_id,
        mimeType: "image/jpeg",
        caption: msg.caption ?? "",
        sizeBytes: largest.file_size,
      },
    };
  }

  // 6. Tipos no soportados todavía (audio, video, document, sticker, location)
  return null;
}

function buildDisplayName(
  from: TelegramMessage["from"] | undefined
): string | undefined {
  if (!from) return undefined;
  const parts = [from.first_name, from.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return from.username;
}
