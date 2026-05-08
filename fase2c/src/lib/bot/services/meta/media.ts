/**
 * services/meta/media.ts
 *
 * Descarga de media enviada por el cliente (fotos, audios, documentos).
 *
 * Flujo de 2 pasos que impone Meta:
 *   1. GET /{media-id}  → devuelve { url, mime_type, file_size, sha256 }
 *   2. GET {url}        → devuelve los bytes reales del archivo
 *
 * El URL del paso 1 expira en ~5 minutos y requiere el mismo Bearer token.
 */

import { authHeaders, mediaInfoUrl } from "./client";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "meta/media" });

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export interface MediaInfo {
  id: string;
  url: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
}

export interface DownloadResult {
  ok: boolean;
  buffer?: Buffer;
  mimeType?: string;
  error?: string;
}

// ─── Límites ───────────────────────────────────────────────────────────────────

/** Tamaño máximo que aceptamos descargar: 10 MB */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// ─── Paso 1: obtener metadata ──────────────────────────────────────────────────

/**
 * Obtiene la metadata de un media object de Meta.
 * Devuelve la URL temporal para descarga y el MIME type.
 */
export async function getMediaInfo(mediaId: string): Promise<MediaInfo | null> {
  const url = mediaInfoUrl(mediaId);
  const headers = authHeaders();

  try {
    const res = await fetch(url, { method: "GET", headers });

    if (!res.ok) {
      const body = await res.text();
      log.warn({ mediaId, status: res.status, body }, "Error obteniendo info de media");
      return null;
    }

    const data = await res.json();

    return {
      id: data.id ?? mediaId,
      url: data.url,
      mimeType: data.mime_type ?? "application/octet-stream",
      fileSize: data.file_size ?? 0,
      sha256: data.sha256 ?? "",
    };
  } catch (err: any) {
    log.error({ mediaId, err: err?.message }, "Excepción obteniendo info de media");
    return null;
  }
}

// ─── Paso 2: descargar bytes ───────────────────────────────────────────────────

/**
 * Descarga los bytes reales de un media usando la URL temporal de Meta.
 * El header Authorization debe incluirse también en esta segunda petición.
 */
export async function downloadMediaFromUrl(
  mediaUrl: string,
  mimeType: string
): Promise<DownloadResult> {
  const headers = authHeaders();
  // Content-Type no aplica en GET, solo Authorization
  const getHeaders = { Authorization: headers.Authorization };

  try {
    const res = await fetch(mediaUrl, { method: "GET", headers: getHeaders });

    if (!res.ok) {
      log.warn({ mediaUrl, status: res.status }, "Error descargando media");
      return { ok: false, error: `HTTP ${res.status}` };
    }

    const contentLength = res.headers.get("content-length");
    const fileSize = contentLength ? parseInt(contentLength, 10) : 0;

    if (fileSize > MAX_FILE_SIZE_BYTES) {
      log.warn({ mediaUrl, fileSize }, "Media demasiado grande, rechazada");
      return { ok: false, error: `Archivo muy grande (${fileSize} bytes, máx ${MAX_FILE_SIZE_BYTES})` };
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    log.info({ mimeType, bytes: buffer.length }, "Media descargada");
    return { ok: true, buffer, mimeType };
  } catch (err: any) {
    log.error({ mediaUrl, err: err?.message }, "Excepción descargando media");
    return { ok: false, error: err?.message ?? "Network error" };
  }
}

/**
 * Función de conveniencia: dado un media ID de Meta,
 * resuelve la URL y descarga los bytes en un solo paso.
 *
 * Uso típico (Fase 7 — Vision):
 *   const result = await downloadMedia(message.image.id);
 *   if (result.ok) analyzeImage({ imageBase64: result.buffer!.toString('base64') });
 */
export async function downloadMedia(mediaId: string): Promise<DownloadResult> {
  const info = await getMediaInfo(mediaId);

  if (!info) {
    return { ok: false, error: `No se pudo obtener info del media ${mediaId}` };
  }

  if (info.fileSize > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: `Archivo muy grande (${info.fileSize} bytes, máx ${MAX_FILE_SIZE_BYTES})`,
    };
  }

  return downloadMediaFromUrl(info.url, info.mimeType);
}

// ─── Utilidades ────────────────────────────────────────────────────────────────

/**
 * Tipos de media que soporta WhatsApp Cloud API con sus MIME types aceptados.
 * Útil para validar antes de intentar descargar.
 */
export const SUPPORTED_MEDIA_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp"],
  audio: ["audio/aac", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/opus"],
  document: [
    "application/pdf",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "text/plain",
  ],
  video: ["video/mp4", "video/3gpp"],
  sticker: ["image/webp"],
} as const;

export type MediaCategory = keyof typeof SUPPORTED_MEDIA_TYPES;

/**
 * Detecta la categoría de un MIME type.
 */
export function getMediaCategory(mimeType: string): MediaCategory | "unknown" {
  for (const [category, types] of Object.entries(SUPPORTED_MEDIA_TYPES)) {
    if ((types as readonly string[]).includes(mimeType)) {
      return category as MediaCategory;
    }
  }
  return "unknown";
}
