/**
 * Pipeline de análisis de imágenes.
 *
 *   IncomingMessage (type=image)
 *      ↓
 *   ¿tengo url o nativeId?
 *      ↓
 *   ¿hash en cache?  → SÍ → devolver de cache
 *      ↓ NO
 *   downloadMedia(nativeId) → { base64, mimeType }
 *      ↓
 *   analyzeImage(base64+mimeType, prompt textil)
 *      ↓
 *   parsear JSON → VisionAnalysisResult
 *      ↓
 *   guardar en cache
 *      ↓
 *   construir userMessage enriquecido
 *      ↓
 *   return ImageProcessingResult
 *
 * Fail-safe: si CUALQUIER paso falla, devolvemos un resultado dummy
 * que dice "no pude analizar la imagen" y el bot responde pidiendo
 * descripción por texto. Nunca se rompe el flujo.
 */
import type { Redis } from "@upstash/redis";
import type OpenAI from "openai";
import { analyzeImage } from "../../services/openai/vision";
import { downloadMedia, MediaError } from "../../services/meta/media";
import { getCachedAnalysis, setCachedAnalysis } from "./cache";
import { VISION_USER_PROMPT } from "./prompts";
import type {
  ImageProcessingResult,
  VisionAnalysisResult,
} from "./types";
import { getLogger } from "../../observability/logger";
import type { IncomingMessage } from "../../types/messages";

const log = getLogger({ module: "vision/analyzer" });

// ── API principal ─────────────────────────────────────────────────

export interface AnalyzeMessageOptions {
  redis?: Redis;
  openai?: OpenAI;
  /** Override del fetch para tests. */
  fetchImpl?: typeof fetch;
}

/**
 * Analiza una imagen contenida en un IncomingMessage de tipo "image".
 *
 * @returns análisis estructurado + texto enriquecido para inyectar al chat
 */
export async function analyzeIncomingImage(
  message: IncomingMessage,
  options: AnalyzeMessageOptions = {}
): Promise<ImageProcessingResult> {
  if (message.type !== "image" || !message.media) {
    throw new Error(
      "analyzeIncomingImage llamado con mensaje que no es imagen"
    );
  }

  const caption = message.media.caption ?? "";
  const hash = message.media.sha256 ?? message.media.nativeId ?? "";

  // 1. Intentar cache
  if (hash) {
    const cached = await getCachedAnalysis(hash, options.redis);
    if (cached) {
      return {
        analysis: cached,
        enrichedUserMessage: buildEnrichedMessage(cached, caption),
        fromCache: true,
      };
    }
  }

  // 2. Obtener bytes de la imagen
  let analysis: VisionAnalysisResult;

  try {
    const base64Image = await getImageBase64(message, options.fetchImpl);
    analysis = await runVisionAnalysis(
      base64Image.base64,
      base64Image.mimeType,
      options.openai
    );
  } catch (err) {
    log.error(
      { err, channelMessageId: message.channelMessageId },
      "Vision analysis pipeline failed"
    );
    analysis = makeFallbackAnalysis(err);
  }

  // 3. Guardar en cache si tenemos hash y análisis bueno
  if (hash && analysis.esProducto) {
    await setCachedAnalysis(hash, analysis, options.redis);
  }

  return {
    analysis,
    enrichedUserMessage: buildEnrichedMessage(analysis, caption),
    fromCache: false,
  };
}

// ── Pasos internos ────────────────────────────────────────────────

interface ImageBytes {
  base64: string;
  mimeType: string;
}

/**
 * Resuelve los bytes de la imagen.
 * Prioriza nativeId (descarga vía Meta) sobre url directa,
 * porque las URLs de Meta caducan y requieren auth.
 */
async function getImageBase64(
  message: IncomingMessage,
  fetchImpl?: typeof fetch
): Promise<ImageBytes> {
  const media = message.media!;

  // Caso 1: tenemos nativeId → descargar vía Meta API
  if (media.nativeId) {
    const downloaded = await downloadMedia(media.nativeId, fetchImpl ?? fetch);
    return {
      base64: downloaded.base64,
      mimeType: downloaded.mimeType,
    };
  }

  // Caso 2: tenemos una URL pública (ej. Telegram, Instagram, o un transport
  // que ya descargó y reuploadeo). Bajamos directo.
  if (media.url) {
    const res = await (fetchImpl ?? fetch)(media.url);
    if (!res.ok) {
      throw new Error(`Fetch directa falló: ${res.status}`);
    }
    const buf = await res.arrayBuffer();
    return {
      base64: Buffer.from(buf).toString("base64"),
      mimeType: media.mimeType ?? "image/jpeg",
    };
  }

  throw new Error("Mensaje de imagen sin nativeId ni url");
}

/**
 * Llama a GPT-4o vision con el prompt textil y parsea la respuesta JSON.
 */
async function runVisionAnalysis(
  base64: string,
  mimeType: string,
  openai?: OpenAI
): Promise<VisionAnalysisResult> {
  const raw = await analyzeImage(
    {
      imageBase64: base64,
      imageMimeType: mimeType,
      prompt: VISION_USER_PROMPT,
      maxTokens: 600,
    },
    openai
  );

  return parseVisionResponse(raw);
}

/**
 * Parsea la respuesta de GPT a VisionAnalysisResult.
 * Defensive: si GPT puso ```json``` o texto extra, lo limpia.
 */
export function parseVisionResponse(raw: string): VisionAnalysisResult {
  if (!raw || raw.trim().length === 0) {
    return makeFallbackAnalysis(new Error("Respuesta vacía de vision"));
  }

  // Limpiar markdown fences si los puso
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
  cleaned = cleaned.replace(/\s*```$/i, "");

  // A veces GPT antepone "Aquí está el JSON:" — sacamos el primer {
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace > 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(cleaned) as Partial<VisionAnalysisResult>;
    return normalize(parsed);
  } catch (err) {
    log.warn(
      { err, rawPreview: raw.slice(0, 120) },
      "No se pudo parsear JSON de vision, usando fallback"
    );
    return makeFallbackAnalysis(err);
  }
}

function normalize(parsed: Partial<VisionAnalysisResult>): VisionAnalysisResult {
  return {
    esProducto: Boolean(parsed.esProducto),
    razonNoEsProducto: parsed.razonNoEsProducto ?? undefined,
    descripcion: String(parsed.descripcion ?? "").trim(),
    tipoTela: parsed.tipoTela ?? undefined,
    colores: Array.isArray(parsed.colores) ? parsed.colores.map(String) : [],
    atributos: Array.isArray(parsed.atributos)
      ? parsed.atributos.map(String)
      : [],
    usosProbables: Array.isArray(parsed.usosProbables)
      ? parsed.usosProbables.map(String)
      : [],
    confianza: clamp01(Number(parsed.confianza ?? 0.5)),
  };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function makeFallbackAnalysis(err: unknown): VisionAnalysisResult {
  const msg = err instanceof Error ? err.message : String(err);
  return {
    esProducto: false,
    razonNoEsProducto: "no se pudo analizar la imagen",
    descripcion: "",
    colores: [],
    atributos: [],
    usosProbables: [],
    confianza: 0,
    // Guardamos el motivo para debugging interno
    ...({ _error: msg } as any),
  };
}

// ── Construcción del user message enriquecido ─────────────────────

/**
 * Construye el texto que se inyecta al chat como el "user message".
 * Incluye:
 *  - El caption del cliente (lo que escribió junto a la foto)
 *  - La descripción visual generada
 *  - Atributos detectados, para que el RAG y el bot puedan responder
 *
 * Si NO es producto, el mensaje pide al cliente describir o reenviar.
 */
export function buildEnrichedMessage(
  analysis: VisionAnalysisResult,
  caption: string
): string {
  if (!analysis.esProducto) {
    const motivo = analysis.razonNoEsProducto
      ? ` (parece ${analysis.razonNoEsProducto})`
      : "";
    return caption.trim()
      ? `El cliente mandó una imagen${motivo} y escribió: "${caption.trim()}". La imagen no parece ser de un producto textil. Pregunta amablemente si puede describir lo que necesita o reenviar otra foto.`
      : `El cliente mandó una imagen pero no parece ser un producto textil${motivo}. Pregunta amablemente qué necesita.`;
  }

  const partes: string[] = [];
  partes.push(`[IMAGEN ANALIZADA por el bot]`);
  partes.push(`Descripción: ${analysis.descripcion}`);
  if (analysis.tipoTela) partes.push(`Tipo aparente: ${analysis.tipoTela}`);
  if (analysis.colores.length > 0)
    partes.push(`Colores: ${analysis.colores.join(", ")}`);
  if (analysis.atributos.length > 0)
    partes.push(`Atributos: ${analysis.atributos.join(", ")}`);
  if (analysis.usosProbables.length > 0)
    partes.push(`Usos típicos: ${analysis.usosProbables.join(", ")}`);
  partes.push(`Confianza del análisis: ${(analysis.confianza * 100).toFixed(0)}%`);

  if (caption.trim()) {
    partes.push("");
    partes.push(`El cliente escribió junto a la foto: "${caption.trim()}"`);
  }

  partes.push("");
  partes.push(
    "INSTRUCCIÓN: usa la descripción de la imagen para identificar qué producto del catálogo se parece. Si ninguno coincide, dilo honestamente."
  );

  return partes.join("\n");
}
