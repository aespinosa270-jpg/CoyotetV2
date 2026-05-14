/**
 * Adapter inbound del transport INSTAGRAM.
 *
 * Instagram DMs llegan via Meta Graph API (mismo backend que WhatsApp,
 * pero shape DISTINTA del payload).
 *
 * Estructura típica del webhook:
 *   {
 *     object: "instagram",
 *     entry: [{
 *       id: "PAGE_ID",
 *       time: 1735603200,
 *       messaging: [{
 *         sender: { id: "IG_USER_ID" },
 *         recipient: { id: "PAGE_ID" },
 *         timestamp: 1735603200000,
 *         message: { mid: "...", text?, attachments? }
 *       }]
 *     }]
 *   }
 *
 * Diferencias clave vs WhatsApp:
 *  - Identidad: sender.id (no es un teléfono, es un user ID de IG)
 *  - Imágenes: vienen en attachments[].payload.url (ya públicas, sin necesidad de getMediaInfo)
 *  - No hay sha256, no hay file_size por defecto
 *  - Solo procesa Direct Messages, NO comentarios en posts
 *
 * Docs: https://developers.facebook.com/docs/messenger-platform/instagram/features/webhook
 */
import type { IncomingMessage } from "../../types/messages";

// ── Tipos del webhook de Instagram (subset que usamos) ─────────────

export interface InstagramWebhookPayload {
  object: string; // "instagram"
  entry: InstagramEntry[];
}

export interface InstagramEntry {
  id: string; // PAGE_ID (la cuenta de business)
  time: number; // unix ms
  messaging?: InstagramMessagingItem[];
  changes?: unknown[]; // para comments/mentions — ignoramos
}

export interface InstagramMessagingItem {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: InstagramMessage;
  postback?: InstagramPostback;
  read?: { mid: string };
  delivery?: { mids: string[] };
}

export interface InstagramMessage {
  mid: string;
  text?: string;
  attachments?: InstagramAttachment[];
  /** Si está presente: el cliente respondió a una historia del business */
  reply_to?: { story?: { id: string } };
  /** El cliente está respondiendo (citando) un mensaje previo del bot */
  quick_reply?: { payload: string };
  /** Indica que el mensaje vino de la propia cuenta — IGNORAR */
  is_echo?: boolean;
}

export interface InstagramAttachment {
  type: "image" | "video" | "audio" | "file" | "story_mention" | "share";
  payload: {
    url?: string;
    sticker_id?: number;
  };
}

export interface InstagramPostback {
  mid: string;
  payload: string;
  title?: string;
}

// ── Conversión ────────────────────────────────────────────────────

/**
 * Convierte un payload del webhook de Instagram a un array de IncomingMessage.
 * Un solo webhook puede contener MÚLTIPLES mensajes — por eso retornamos array.
 */
export function buildIncomingFromInstagram(
  payload: InstagramWebhookPayload
): IncomingMessage[] {
  const results: IncomingMessage[] = [];

  if (payload.object !== "instagram") return results;
  if (!Array.isArray(payload.entry)) return results;

  for (const entry of payload.entry) {
    if (!Array.isArray(entry.messaging)) continue;

    for (const item of entry.messaging) {
      const converted = convertOne(item, entry.id);
      if (converted) results.push(converted);
    }
  }

  return results;
}

function convertOne(
  item: InstagramMessagingItem,
  pageId: string
): IncomingMessage | null {
  // Ignorar callbacks de delivery/read receipts
  if (item.delivery || item.read) return null;

  // Postback (click en botón) — futuro
  if (item.postback) return null;

  const msg = item.message;
  if (!msg) return null;

  // IGNORAR echos (mensajes que enviamos nosotros mismos)
  if (msg.is_echo) return null;

  // IGNORAR story replies (el cliente respondió a nuestra historia) — futuro
  if (msg.reply_to?.story) return null;

  const clientId = `ig:${item.sender.id}`;
  const base = {
    id: `ig_${msg.mid}`,
    channel: "instagram" as const,
    channelMessageId: msg.mid,
    from: { id: clientId },
    to: { id: `ig_page:${pageId}` },
    receivedAt: new Date(item.timestamp),
    raw: item,
  };

  // 1. Quick reply (cliente clickeó un botón de opciones rápidas)
  if (msg.quick_reply) {
    return {
      ...base,
      type: "interactive",
      interactive: {
        payload: msg.quick_reply.payload,
        label: msg.text,
      },
    };
  }

  // 2. Imagen en attachments
  const imageAttachment = msg.attachments?.find((a) => a.type === "image");
  if (imageAttachment && imageAttachment.payload.url) {
    return {
      ...base,
      type: "image",
      media: {
        url: imageAttachment.payload.url, // URL pública, sin necesidad de auth
        mimeType: "image/jpeg",
        caption: msg.text ?? "",
      },
    };
  }

  // 3. Texto puro
  if (msg.text && msg.text.trim().length > 0) {
    return {
      ...base,
      type: "text",
      text: msg.text.trim(),
    };
  }

  // Tipos no soportados: video, audio, stickers, story_mention, shares
  return null;
}
