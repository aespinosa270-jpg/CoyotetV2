/**
 * Servicio de transcripción de audio con OpenAI Whisper.
 *
 * Costo: $0.006/min. Para audios B2B típicos (30s-2min): ~$0.003-0.012 USD.
 *
 * Whisper acepta:
 *  - Formatos: ogg, mp3, mp4, mpeg, mpga, m4a, wav, webm
 *  - Tamaño máx: 25 MB (mucho más que nuestro límite de 2 MB)
 *  - WhatsApp manda OGG/Opus que Whisper soporta nativamente
 *
 * Función pura sin estado: recibe el binario, retorna texto.
 * El cache vive en `intelligence/audio/transcriber.ts`, no aquí.
 */
import OpenAI from "openai";
import { getEnv } from "../../config/env";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "openai/whisper" });

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const env = getEnv();
    _client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return _client;
}

export interface TranscribeOptions {
  /** Cliente OpenAI custom (para tests). */
  client?: OpenAI;
  /** Lenguaje esperado. Default "es" (mejora precisión). */
  language?: string;
  /** Prompt opcional para influenciar términos técnicos. */
  prompt?: string;
}

export interface TranscriptionResult {
  text: string;
  /** Duración real del audio en segundos, si Whisper la reportó. */
  durationSec?: number;
  /** Lenguaje detectado, si Whisper lo reportó. */
  detectedLanguage?: string;
}

/**
 * Transcribe un audio en base64 a texto usando Whisper.
 * @param base64 binario en base64 (sin prefijo data:)
 * @param mimeType MIME para que Whisper sepa el formato (ej. "audio/ogg")
 */
export async function transcribeAudio(
  base64: string,
  mimeType: string,
  options: TranscribeOptions = {}
): Promise<TranscriptionResult> {
  const client = options.client ?? getClient();
  const language = options.language ?? "es";
  const start = Date.now();

  // Convertir base64 a Buffer → File-like (Node 20 tiene File global)
  const buffer = Buffer.from(base64, "base64");
  const extension = mimeTypeToExtension(mimeType);
  const filename = `audio.${extension}`;

  // OpenAI SDK acepta un File-like con name, type
  const fileLike = new File([buffer], filename, { type: mimeType });

  try {
    const result = await client.audio.transcriptions.create({
      file: fileLike as any,
      model: "whisper-1",
      language,
      prompt: options.prompt,
      response_format: "verbose_json",
    });

    log.info(
      {
        textLength: (result.text ?? "").length,
        durationSec: (result as any).duration,
        latencyMs: Date.now() - start,
      },
      "Whisper transcripción OK"
    );

    return {
      text: (result.text ?? "").trim(),
      durationSec: (result as any).duration,
      detectedLanguage: (result as any).language,
    };
  } catch (err) {
    log.error(
      { err, mimeType, sizeBytes: buffer.length },
      "Whisper transcripción falló"
    );
    throw err;
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function mimeTypeToExtension(mime: string): string {
  const lower = mime.toLowerCase();
  if (lower.includes("ogg") || lower.includes("opus")) return "ogg";
  if (lower.includes("mp3") || lower.includes("mpeg")) return "mp3";
  if (lower.includes("mp4") || lower.includes("m4a")) return "m4a";
  if (lower.includes("wav")) return "wav";
  if (lower.includes("webm")) return "webm";
  return "ogg"; // default WA
}
