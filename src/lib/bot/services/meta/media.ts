/**
 * Resolución y descarga de media desde Meta (WhatsApp Cloud API).
 *
 * Cuando el cliente manda una foto, lo que llega al webhook es solo un
 * `media_id`. Para obtener el binario real hay dos pasos:
 *
 *   1. GET /{media_id} → devuelve { url, mime_type, sha256, file_size }
 *      (la URL caduca rápido, requiere bearer auth para descargar)
 *
 *   2. GET {url} con Authorization → devuelve el binario
 *
 * NUNCA expongas la URL pública de Meta al usuario o a OpenAI directamente
 * porque requiere el bearer token de WhatsApp. En su lugar descargamos el
 * binario y lo pasamos a OpenAI como base64.
 */
import { getEnv } from "../../config/env";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "meta/media" });

const META_GRAPH_BASE = "https://graph.facebook.com";

// ── Resolver el ID a URL temporal + metadata ──────────────────────

export interface MediaInfo {
  url: string;
  mimeType: string;
  sha256?: string;
  fileSize?: number;
  /** Cuándo caduca la URL (estimación: ~5 min desde el momento). */
  expiresAt: Date;
}

/**
 * Convierte un `nativeId` (media_id de Meta) en metadata accesible.
 * NOTA: la `url` retornada solo es válida ~5 min y requiere bearer auth para descargar.
 */
export async function getMediaInfo(
  nativeId: string,
  fetchImpl: typeof fetch = fetch
): Promise<MediaInfo> {
  const env = getEnv();
  const version = env.META_GRAPH_API_VERSION;
  const endpoint = `${META_GRAPH_BASE}/${version}/${nativeId}`;

  const res = await fetchImpl(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
    },
  });

  if (!res.ok) {
    const body = await safeText(res);
    log.error({ status: res.status, body, nativeId }, "getMediaInfo failed");
    throw new MediaError(
      `getMediaInfo failed (${res.status}): ${body}`,
      "resolve",
      res.status
    );
  }

  const json = (await res.json()) as {
    url?: string;
    mime_type?: string;
    sha256?: string;
    file_size?: number;
  };

  if (!json.url || !json.mime_type) {
    throw new MediaError("Respuesta de Meta sin url/mime_type", "resolve");
  }

  return {
    url: json.url,
    mimeType: json.mime_type,
    sha256: json.sha256,
    fileSize: json.file_size,
    // Meta dice 5 min, nos quedamos conservadores en 4
    expiresAt: new Date(Date.now() + 4 * 60 * 1000),
  };
}

// ── Descargar el binario y devolver base64 ────────────────────────

export interface DownloadedMedia {
  base64: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Descarga el binario de Meta y lo devuelve en base64 (sin prefijo data:).
 * Usa Authorization header con el token de WhatsApp.
 *
 * IMPORTANTE: ojo con archivos grandes. Para imágenes B2B típicas (< 5 MB)
 * está bien. Si tu app empieza a aceptar videos o documentos grandes,
 * considera streaming a disk o S3 en lugar de base64 en memoria.
 */
export async function downloadMedia(
  nativeId: string,
  fetchImpl: typeof fetch = fetch
): Promise<DownloadedMedia> {
  const env = getEnv();
  const info = await getMediaInfo(nativeId, fetchImpl);

  log.debug(
    { nativeId, mimeType: info.mimeType, sizeBytes: info.fileSize },
    "Descargando media"
  );

  const res = await fetchImpl(info.url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
    },
  });

  if (!res.ok) {
    const body = await safeText(res);
    log.error({ status: res.status, body, nativeId }, "downloadMedia failed");
    throw new MediaError(
      `downloadMedia failed (${res.status}): ${body}`,
      "download",
      res.status
    );
  }

  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  return {
    base64,
    mimeType: info.mimeType,
    sizeBytes: buffer.byteLength,
  };
}

// ── Helpers ────────────────────────────────────────────────────────

export class MediaError extends Error {
  constructor(
    message: string,
    public readonly stage: "resolve" | "download",
    public readonly httpStatus?: number
  ) {
    super(message);
    this.name = "MediaError";
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "<unreadable response>";
  }
}
