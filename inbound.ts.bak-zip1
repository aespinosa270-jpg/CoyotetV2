import type { IncomingMessage } from "../../types/messages";
import { isDuplicateMessage } from "../../guards/dedupe";
import { getRedis } from "../../repositories/redis";
import { getLogger } from "../../observability/logger";
import { processMessage } from "../../core/orchestrator";
import { sendText } from "../../services/meta/send";

const log = getLogger({ module: "whatsapp-adapter" });

export async function handleWhatsAppWebhook(payload: any): Promise<void> {
  const entry = payload?.entry?.[0];
  const value = entry?.changes?.[0]?.value;
  const mensajes = value?.messages;
  if (!mensajes || mensajes.length === 0) return;

  const msg = mensajes[0];
  const messageId = msg.id;
  const rawPhone = msg.from as string;
  const phone =
    rawPhone.startsWith("521") && rawPhone.length === 13
      ? rawPhone.replace(/^521/, "52")
      : rawPhone;

  const redis = getRedis();
  if (await isDuplicateMessage(messageId, redis)) return;

  // ── Construir IncomingMessage según el tipo ──
  const incoming = buildIncomingMessage(msg, messageId, phone);

  if (!incoming) {
    log.info({ type: msg.type, messageId }, "Tipo de mensaje no soportado todavía");
    return;
  }

  const responses = await processMessage(incoming);

  for (const res of responses) {
    if (res.type === "text" && res.text) {
      log.info({ to: res.to.id, length: res.text.length }, "Enviando respuesta a WhatsApp");
      try {
        await sendText(res.to.id, res.text);
      } catch (error) {
        log.error({ err: error, to: res.to.id }, "Error al enviar via Meta API");
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function buildIncomingMessage(
  msg: any,
  messageId: string,
  phone: string
): IncomingMessage | null {
  const base = {
    id: messageId,
    channel: "whatsapp" as const,
    channelMessageId: messageId,
    from: { id: phone, displayName: msg.profile?.name },
    to: { id: "coyote_bot" },
    receivedAt: new Date(),
    raw: msg,
  };

  switch (msg.type) {
    case "text":
      return {
        ...base,
        type: "text",
        text: msg.text?.body ?? "",
      };

    case "image":
      // FASE 7: pasar la imagen al pipeline de vision
      return {
        ...base,
        type: "image",
        media: {
          nativeId: msg.image?.id,
          mimeType: msg.image?.mime_type,
          sha256: msg.image?.sha256,
          caption: msg.image?.caption ?? "",
        },
      };

    case "audio":
      // FASE 11B: pasar el audio al pipeline de transcripción Whisper.
      // WhatsApp puede mandar tipos "audio" (mensaje de voz) o "voice".
      // Ambos vienen en msg.audio con la misma estructura.
      return {
        ...base,
        type: "audio",
        media: {
          nativeId: msg.audio?.id ?? msg.voice?.id,
          mimeType: msg.audio?.mime_type ?? msg.voice?.mime_type,
          sha256: msg.audio?.sha256 ?? msg.voice?.sha256,
          sizeBytes: msg.audio?.file_size ?? msg.voice?.file_size,
        },
      };

    case "video":
    case "document":
      // Por ahora no soportados pero al menos los registramos
      return null;

    case "interactive":
      // Botones / listas que el bot envió previamente
      return {
        ...base,
        type: "interactive",
        interactive: {
          payload:
            msg.interactive?.button_reply?.id ??
            msg.interactive?.list_reply?.id ??
            "",
          label:
            msg.interactive?.button_reply?.title ??
            msg.interactive?.list_reply?.title,
        },
      };

    default:
      return null;
  }
}
