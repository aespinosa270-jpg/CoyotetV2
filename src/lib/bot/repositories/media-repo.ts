/**
 * Repository de media recibida por el cliente.
 *
 * Guarda mediaId/type/caption/timestamp/análisis vision por mensaje, paralelo
 * al historial conversacional. El CRM hace merge entre historial + media-storage
 * por timestamp para renderizar imágenes/audios/videos inline.
 *
 * No toca el orchestrator del bot — solo se llama desde `inbound.ts` antes de
 * delegar al pipeline, y desde el CRM al leer la conversación.
 */
import type { Redis } from "@upstash/redis";
import { getRedis } from "./redis";
import { keys } from "./keys";
import { MEMORY } from "../config/constants";
import { getLogger } from "../observability/logger";

const log = getLogger({ module: "media-repo" });

export type MediaTipo = "image" | "audio" | "video" | "document";

export interface MediaMensaje {
  messageId: string;
  /** ID nativo de WhatsApp Cloud API para descargar el binario. */
  nativeId: string;
  /** image | audio | video | document */
  tipo: MediaTipo;
  /** image/jpeg, audio/ogg, video/mp4, application/pdf, etc. */
  mimeType?: string;
  caption?: string;
  /** ISO timestamp del momento de recepción (matcheable con historial). */
  timestamp: string;
  /** Análisis vision parseado (solo aplica a image). Opcional para futuro. */
  vision?: {
    esProducto?: boolean;
    tipoTela?: string;
    confianza?: number;
    colores?: string[];
    descripcion?: string;
  };
  /** Transcripción Whisper (solo aplica a audio). */
  transcripcion?: string;
}

// ─── Lectura ─────────────────────────────────────────────────────────────────

export async function getMediaList(
  phone: string,
  redis: Redis = getRedis()
): Promise<MediaMensaje[]> {
  try {
    const data = await redis.get<MediaMensaje[]>(keys.media(phone));
    return Array.isArray(data) ? data : [];
  } catch (err) {
    log.error({ err, phone }, "Error leyendo media list");
    return [];
  }
}

// ─── Escritura ───────────────────────────────────────────────────────────────

export async function appendMedia(
  phone: string,
  media: MediaMensaje,
  redis: Redis = getRedis()
): Promise<void> {
  try {
    const current = await getMediaList(phone, redis);
    // Dedupe por messageId
    if (current.some((m) => m.messageId === media.messageId)) {
      log.debug({ phone, messageId: media.messageId }, "Media ya registrada, skip");
      return;
    }
    const updated = [...current, media];
    // Compactar a últimos 100 (para no crecer infinito)
    const trimmed = updated.length > 100 ? updated.slice(-100) : updated;
    await redis.set(keys.media(phone), trimmed, {
      ex: MEMORY.HISTORY_TTL_SECONDS,
    });
    log.info(
      { phone, messageId: media.messageId, tipo: media.tipo },
      "Media registrada en media-repo"
    );
  } catch (err) {
    log.error({ err, phone, messageId: media.messageId }, "Error guardando media");
  }
}

/**
 * Actualiza el análisis vision/transcripción de una media existente.
 * Se llama desde el orchestrator DESPUÉS de procesar la imagen/audio.
 */
export async function attachVisionAnalysis(
  phone: string,
  messageId: string,
  vision: MediaMensaje["vision"],
  redis: Redis = getRedis()
): Promise<void> {
  try {
    const current = await getMediaList(phone, redis);
    const idx = current.findIndex((m) => m.messageId === messageId);
    if (idx === -1) {
      log.debug({ phone, messageId }, "Media no existe para attach vision, skip");
      return;
    }
    current[idx] = { ...current[idx], vision };
    await redis.set(keys.media(phone), current, {
      ex: MEMORY.HISTORY_TTL_SECONDS,
    });
  } catch (err) {
    log.error({ err, phone, messageId }, "Error en attachVisionAnalysis");
  }
}

export async function attachTranscripcion(
  phone: string,
  messageId: string,
  transcripcion: string,
  redis: Redis = getRedis()
): Promise<void> {
  try {
    const current = await getMediaList(phone, redis);
    const idx = current.findIndex((m) => m.messageId === messageId);
    if (idx === -1) return;
    current[idx] = { ...current[idx], transcripcion };
    await redis.set(keys.media(phone), current, {
      ex: MEMORY.HISTORY_TTL_SECONDS,
    });
  } catch (err) {
    log.error({ err, phone, messageId }, "Error en attachTranscripcion");
  }
}

export async function clearMedia(
  phone: string,
  redis: Redis = getRedis()
): Promise<boolean> {
  const count = await redis.del(keys.media(phone));
  return count > 0;
}
