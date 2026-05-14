/**
 * Adapter outbound del transport WEB.
 *
 * Convierte los OutgoingMessage del orchestrator a JSON que el widget
 * puede renderizar directamente.
 *
 * A diferencia de WhatsApp/Telegram que llaman a una API externa para
 * "enviar", aquí simplemente serializamos y dejamos que el endpoint los
 * devuelva como respuesta HTTP.
 */
import type { OutgoingMessage } from "../../types/messages";

export interface WebChatResponseMessage {
  type: "text" | "image" | "interactive";
  text?: string;
  imageUrl?: string;
  buttons?: Array<{ payload: string; label: string }>;
}

export interface WebChatResponse {
  messages: WebChatResponseMessage[];
  meta?: {
    /** Indica al widget si el bot quiere subir el feedback */
    showRating?: boolean;
    /** Tactica activa, útil para debug en dev */
    tactica?: string;
  };
}

/**
 * Convierte el array de mensajes salientes del orchestrator al payload
 * que el widget renderiza.
 */
export function buildWebResponse(
  outgoing: OutgoingMessage[]
): WebChatResponse {
  const messages: WebChatResponseMessage[] = outgoing.map((m) => {
    if (m.type === "image") {
      return {
        type: "image",
        imageUrl: m.media?.url,
        text: m.media?.caption ?? m.text,
      };
    }
    if (m.type === "interactive") {
      return {
        type: "interactive",
        text: m.interactive?.body,
        buttons: m.interactive?.buttons,
      };
    }
    return {
      type: "text",
      text: m.text ?? "",
    };
  });

  return { messages };
}
