import type { IncomingMessage, OutgoingMessage } from "../../types/messages";
import { isDuplicateMessage } from "../../guards/dedupe";
import { getRedis } from "../../repositories/redis";
import { getLogger } from "../../observability/logger";
import { processMessage } from "../../core/orchestrator";
// Importamos la función real construida en la Fase 2C
import { sendText } from "../../services/meta/send";

const log = getLogger({ module: "whatsapp-adapter" });

export async function handleWhatsAppWebhook(payload: any): Promise<void> {
  const entry = payload?.entry?.[0];
  const value = entry?.changes?.[0]?.value;
  const mensajes = value?.messages;

  if (!mensajes || mensajes.length === 0) return;

  const msg = mensajes[0];
  if (msg.type !== "text") {
    log.info({ type: msg.type }, "Ignorando mensaje no-texto (Fase 3 MVP)");
    return;
  }

  const messageId = msg.id;
  const rawPhone = msg.from as string;
  const phone = rawPhone.startsWith("521") && rawPhone.length === 13 ? rawPhone.replace(/^521/, "52") : rawPhone;
  const text = msg.text.body;

  const redis = getRedis();
  
  if (await isDuplicateMessage(messageId, redis)) return;

  // ADAPTADO AL TIPO ESTRICTO DE LA FASE 0
  const incoming: IncomingMessage = {
    id: messageId, // Usamos el ID de Meta como ID interno
    channel: "whatsapp",
    channelMessageId: messageId,
    from: { id: phone },
    to: { id: "coyote_bot" },
    type: "text",
    text: text,
    receivedAt: new Date(),
    raw: msg
  };

  const responses = await processMessage(incoming);

  for (const res of responses) {
    if (res.type === "text" && res.text) {
      log.info({ to: res.to.id, text: res.text }, "Enviando respuesta a WhatsApp");
      try {
        await sendText(res.to.id, res.text);
      } catch (error) {
        log.error({ err: error, to: res.to.id }, "Error al enviar mensaje vía Meta API");
      }
    }
  }
}