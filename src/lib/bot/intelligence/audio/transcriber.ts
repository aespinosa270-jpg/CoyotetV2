/**
 * Pipeline completo de transcripción de audio del bot.
 *
 * Responsabilidades:
 *  1. Validar tamaño máximo (2 MB = ~2 min de audio en OPUS)
 *  2. Cache de transcripciones por sha256 (TTL 7 días)
 *  3. Descargar el audio de Meta (si es WhatsApp)
 *  4. Transcribir con Whisper
 *  5. Persistir en cache
 *
 * Si el audio es muy largo, devuelve `tooLong: true` y el orchestrator
 * responde al cliente pidiéndole un audio más corto.
 */
import type { Redis } from "@upstash/redis";
import type OpenAI from "openai";
import { downloadMedia, getMediaInfo } from "../../services/meta/media";
import { transcribeAudio } from "../../services/openai/whisper";
import { getRedis } from "../../repositories/redis";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "audio/transcriber" });

/** 2 MB ≈ ~2 minutos de audio OPUS (codec de WhatsApp). */
export const MAX_AUDIO_SIZE_BYTES = 2 * 1024 * 1024;

const CACHE_PREFIX = "v2:audio:transcript:";
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface TranscribeIncomingOptions {
  redis?: Redis;
  openaiClient?: OpenAI;
  /** Saltar el cache (útil para testing). */
  skipCache?: boolean;
}

export interface TranscribeIncomingInput {
  /** Media ID nativo de Meta. */
  nativeId: string;
  /** MIME type del audio (ej. "audio/ogg; codecs=opus"). */
  mimeType?: string;
  /** sha256 del audio (Meta lo da). Usado como cache key. */
  sha256?: string;
  /** Tamaño en bytes, si se conoce ANTES de descargar. */
  sizeBytes?: number;
}

export type TranscribeIncomingResult =
  | {
      ok: true;
      text: string;
      fromCache: boolean;
      durationSec?: number;
    }
  | {
      ok: false;
      tooLong: true;
      sizeBytes: number;
    }
  | {
      ok: false;
      tooLong: false;
      error: string;
    };

/**
 * Transcribe un audio entrante.
 *
 * Si `sizeBytes` se conoce y excede MAX_AUDIO_SIZE_BYTES, NO descarga
 * nada y retorna `tooLong: true` inmediatamente.
 */
export async function transcribeIncoming(
  input: TranscribeIncomingInput,
  options: TranscribeIncomingOptions = {}
): Promise<TranscribeIncomingResult> {
  const redis = options.redis ?? getRedis();

  // ── 1. Validación rápida si Meta ya nos dio el tamaño ──
  if (
    typeof input.sizeBytes === "number" &&
    input.sizeBytes > MAX_AUDIO_SIZE_BYTES
  ) {
    log.info(
      { sizeBytes: input.sizeBytes, limit: MAX_AUDIO_SIZE_BYTES },
      "Audio rechazado por tamaño (pre-descarga)"
    );
    return { ok: false, tooLong: true, sizeBytes: input.sizeBytes };
  }

  // ── 2. Cache hit ──
  if (input.sha256 && !options.skipCache) {
    try {
      const cached = await redis.get<{ text: string; durationSec?: number }>(
        CACHE_PREFIX + input.sha256
      );
      if (cached && cached.text) {
        log.info({ sha256: input.sha256 }, "Cache hit de transcripción");
        return {
          ok: true,
          text: cached.text,
          fromCache: true,
          durationSec: cached.durationSec,
        };
      }
    } catch (err) {
      log.warn({ err }, "Error leyendo cache de transcripción, continuando");
    }
  }

  // ── 3. Si no teníamos tamaño, consultarlo a Meta primero ──
  // (downloadMedia ya hace getMediaInfo internamente, pero queremos
  //  abortar ANTES de bajar el binario si supera el límite)
  if (typeof input.sizeBytes !== "number") {
    try {
      const info = await getMediaInfo(input.nativeId);
      if (info.fileSize && info.fileSize > MAX_AUDIO_SIZE_BYTES) {
        log.info(
          { sizeBytes: info.fileSize, limit: MAX_AUDIO_SIZE_BYTES },
          "Audio rechazado por tamaño (post-getMediaInfo)"
        );
        return { ok: false, tooLong: true, sizeBytes: info.fileSize };
      }
    } catch (err) {
      log.warn(
        { err, nativeId: input.nativeId },
        "getMediaInfo falló, intentaremos descargar igual"
      );
    }
  }

  // ── 4. Descargar ──
  let media: { base64: string; mimeType: string; sizeBytes: number };
  try {
    media = await downloadMedia(input.nativeId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg, nativeId: input.nativeId }, "Fallo al descargar audio");
    return { ok: false, tooLong: false, error: msg };
  }

  // ── 5. Validación post-descarga (por si Meta nos mintió en sizeBytes) ──
  if (media.sizeBytes > MAX_AUDIO_SIZE_BYTES) {
    return { ok: false, tooLong: true, sizeBytes: media.sizeBytes };
  }

  // ── 6. Transcribir ──
  try {
    const transcription = await transcribeAudio(
      media.base64,
      input.mimeType ?? media.mimeType,
      { client: options.openaiClient, language: "es" }
    );

    if (!transcription.text || transcription.text.length < 2) {
      return {
        ok: false,
        tooLong: false,
        error: "Whisper devolvió transcripción vacía",
      };
    }

    // ── 7. Guardar en cache ──
    if (input.sha256) {
      try {
        await redis.set(
          CACHE_PREFIX + input.sha256,
          {
            text: transcription.text,
            durationSec: transcription.durationSec,
          },
          { ex: CACHE_TTL_SECONDS }
        );
      } catch (err) {
        log.warn({ err }, "No se pudo guardar transcripción en cache");
      }
    }

    return {
      ok: true,
      text: transcription.text,
      fromCache: false,
      durationSec: transcription.durationSec,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(
      { err: msg, nativeId: input.nativeId },
      "Whisper falló transcribiendo audio"
    );
    return { ok: false, tooLong: false, error: msg };
  }
}

/**
 * Mensaje amable que el bot responde cuando el audio es demasiado largo.
 * Se inyecta como respuesta directa en el orchestrator (sin pasar por LLM).
 */
export function buildTooLongMessage(): string {
  return "🎙️ Su audio es un poco largo para que lo procese bien. ¿Me lo puede mandar por escrito o en un audio más corto (menos de 2 minutos)?";
}

/**
 * Mensaje amable cuando la transcripción falló por error técnico.
 */
export function buildTranscriptionFailedMessage(): string {
  return "🎙️ Tuve un problema procesando su audio. ¿Me lo puede repetir por escrito o intentar de nuevo en un momento?";
}
