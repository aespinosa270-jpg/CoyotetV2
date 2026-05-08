/**
 * Tipos universales de mensajería.
 *
 * Estos son el ÚNICO contrato entre los transports (whatsapp, instagram,
 * telegram, web) y el cerebro del bot.
 *
 * Regla de oro: si un campo solo aplica a WhatsApp, no vive aquí. Vive
 * en el transport y se traduce.
 */

// ── Canales soportados ─────────────────────────────────────────────
export type Channel = "whatsapp" | "instagram" | "telegram" | "web";

// ── Tipos de mensaje ───────────────────────────────────────────────
export type IncomingMessageType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "document"
  | "location"
  | "contact"
  | "interactive" // botones, listas
  | "unsupported";

export type OutgoingMessageType =
  | "text"
  | "image"
  | "document"
  | "template" // solo WA, las plantillas pre-aprobadas
  | "interactive"; // botones / listas en canales que las soporten

// ── Identidad del usuario ──────────────────────────────────────────
export interface MessageActor {
  /** Identificador estable del usuario en el canal. WA: e164. IG/TG: id numérico. Web: uuid. */
  id: string;
  /** Nombre que reportó el canal, si lo hay (no confiable). */
  displayName?: string;
  /** Email, si el canal lo expone (web sí, WA nunca). */
  email?: string;
}

// ── Mensaje entrante ───────────────────────────────────────────────
export interface IncomingMessage {
  /** UUID interno asignado por el bot. */
  id: string;
  /** Canal de origen. */
  channel: Channel;
  /** ID original del canal — para idempotencia/dedupe. */
  channelMessageId: string;

  /** Quién envía. */
  from: MessageActor;
  /** A qué cuenta llega (número de WA, page de IG, bot de TG). */
  to: MessageActor;

  type: IncomingMessageType;

  /** Solo si type === 'text'. */
  text?: string;

  /** Solo si type es media (image, audio, video, document). */
  media?: {
    /** URL temporal o ID que el transport puede resolver. */
    url?: string;
    /** ID nativo del canal (Meta media id, Telegram file_id, etc.). */
    nativeId?: string;
    mimeType?: string;
    sha256?: string;
    /** Caption del usuario, si vino con la imagen/video. */
    caption?: string;
    /** Tamaño en bytes si se conoce. */
    sizeBytes?: number;
  };

  /** Solo si type === 'location'. */
  location?: {
    lat: number;
    lng: number;
    name?: string;
    address?: string;
  };

  /** Solo si type === 'interactive' (selección de botón / lista). */
  interactive?: {
    /** ID del botón que el bot envió previamente. */
    payload: string;
    /** Texto visible del botón seleccionado. */
    label?: string;
  };

  /** Si este mensaje es respuesta a uno previo del bot. */
  replyTo?: {
    channelMessageId: string;
  };

  /** Cuándo lo recibió el canal. */
  receivedAt: Date;

  /** Payload original del canal. Solo para debugging y trazas. NO leerlo en lógica. */
  raw: unknown;
}

// ── Mensaje saliente ───────────────────────────────────────────────
export interface OutgoingMessage {
  channel: Channel;
  to: MessageActor;
  type: OutgoingMessageType;

  /** Solo si type === 'text' o como caption en media. */
  text?: string;

  /** Solo si type es media. */
  media?: {
    /** URL pública (preferido). */
    url?: string;
    /** Alternativa: contenido base64. */
    base64?: string;
    mimeType?: string;
    caption?: string;
    /** Para documentos. */
    filename?: string;
  };

  /** Solo si type === 'interactive'. */
  interactive?: {
    body: string;
    buttons: Array<{
      payload: string;
      label: string;
    }>;
  };

  /** Solo si type === 'template' (WA). */
  template?: {
    name: string;
    language: string;
    components?: unknown;
  };

  /** Si es respuesta a un mensaje específico del usuario. */
  replyTo?: {
    channelMessageId: string;
  };

  /** Metadatos para observabilidad. NO se mandan al canal, solo se loguean. */
  metadata?: {
    conversationId?: string;
    tactica?: string;
    temperaturaCompra?: number;
    toolsCalled?: string[];
  };
}

// ── Resultado de entrega ───────────────────────────────────────────
export type DeliveryStatus = "sent" | "delivered" | "read" | "failed";

export interface DeliveryResult {
  status: DeliveryStatus;
  /** ID que asignó el canal al mensaje saliente. */
  channelMessageId?: string;
  /** Si falló, descripción del error. */
  error?: string;
  /** Cuántos intentos se hicieron antes de este resultado. */
  attempts: number;
  /** Latencia total del envío en ms. */
  latencyMs?: number;
}