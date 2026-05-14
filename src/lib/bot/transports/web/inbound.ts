/**
 * Adapter inbound del transport WEB.
 *
 * Convierte el JSON que viene del widget en un IncomingMessage universal
 * que el orchestrator entiende.
 *
 * Identidad del cliente:
 *  - sessionId: UUID generado y guardado en localStorage del browser
 *  - El bot ve al cliente como `web:{sessionId}` para distinguirlo de
 *    los teléfonos de WhatsApp (52...) y de IDs de Telegram, etc.
 *
 * Si el cliente provee teléfono más adelante (porque quiere comprar),
 * el orquestador puede mergear sessionId → teléfono. Por ahora cada uno
 * es independiente.
 */
import type { IncomingMessage } from "../../types/messages";

/** Lo que envía el widget al endpoint /api/chat/v2 */
export interface WebChatPayload {
  sessionId: string;
  message: string;
  /** Opcional: si el cliente ya proporcionó su nombre durante la conversación */
  clientName?: string;
  /** Timestamp del cliente para latencia y ordenamiento */
  clientTimestamp?: string;
}

/**
 * Construye un IncomingMessage desde el payload del widget.
 */
export function buildIncomingFromWeb(
  payload: WebChatPayload,
  requestId: string
): IncomingMessage {
  // Prefix "web:" para no confundir con teléfonos
  const clientId = `web:${payload.sessionId}`;

  return {
    id: requestId,
    channel: "web",
    channelMessageId: requestId, // En web no hay un message_id externo
    from: {
      id: clientId,
      displayName: payload.clientName,
    },
    to: { id: "coyote_bot" },
    type: "text",
    text: payload.message.trim(),
    receivedAt: payload.clientTimestamp
      ? new Date(payload.clientTimestamp)
      : new Date(),
    raw: payload,
  };
}

/**
 * Valida el payload del widget. Devuelve string con el error si es inválido,
 * null si está OK.
 */
export function validateWebPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return "payload inválido";
  const p = payload as Record<string, unknown>;

  if (typeof p.sessionId !== "string" || p.sessionId.length < 8) {
    return "sessionId requerido (mínimo 8 chars)";
  }
  if (p.sessionId.length > 100) {
    return "sessionId demasiado largo";
  }
  if (typeof p.message !== "string") {
    return "message debe ser string";
  }
  if (p.message.trim().length === 0) {
    return "message vacío";
  }
  if (p.message.length > 4000) {
    return "message demasiado largo (max 4000)";
  }

  return null;
}
