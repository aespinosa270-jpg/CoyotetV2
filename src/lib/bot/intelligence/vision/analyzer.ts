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
 *
 * G3-Vision: schema completo, no descarta esManejada/razonamiento/telaIdentificada.
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
  fetchImpl?: typeof fetch;
}

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

async function getImageBase64(
  message: IncomingMessage,
  fetchImpl?: typeof fetch
): Promise<ImageBytes> {
  const media = message.media!;

  if (media.nativeId) {
    const downloaded = await downloadMedia(media.nativeId, fetchImpl ?? fetch);
    return {
      base64: downloaded.base64,
      mimeType: downloaded.mimeType,
    };
  }

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
      maxTokens: 700,
    },
    openai
  );

  log.info({ rawPreview: raw.slice(0, 200) }, "Vision raw response");

  return parseVisionResponse(raw);
}

export function parseVisionResponse(raw: string): VisionAnalysisResult {
  if (!raw || raw.trim().length === 0) {
    return makeFallbackAnalysis(new Error("Respuesta vacía de vision"));
  }

  // Limpiar markdown fences
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
  cleaned = cleaned.replace(/\s*```$/i, "");

  // Sacar SOLO el primer JSON entre { y }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace > 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(cleaned) as Partial<VisionAnalysisResult> & {
      color?: string | string[]; // GPT a veces lo manda en singular
    };
    return normalize(parsed);
  } catch (err) {
    log.warn(
      { err, rawPreview: raw.slice(0, 200) },
      "No se pudo parsear JSON de vision, usando fallback"
    );
    return makeFallbackAnalysis(err);
  }
}

/**
 * Normaliza el parsed JSON al schema completo.
 * G3: ya NO descarta esManejada/telaIdentificada/razonamiento.
 * Si GPT manda "color" en singular, lo convierte a array.
 */
function normalize(
  parsed: Partial<VisionAnalysisResult> & { color?: string | string[] }
): VisionAnalysisResult {
  // Manejar caso donde GPT manda "color" singular en vez de "colores"
  let colores: string[] = [];
  if (Array.isArray(parsed.colores)) {
    colores = parsed.colores.map(String);
  } else if (Array.isArray(parsed.color)) {
    colores = parsed.color.map(String);
  } else if (typeof parsed.color === "string" && parsed.color.trim()) {
    colores = parsed.color.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  }

  return {
    esProducto: Boolean(parsed.esProducto),
    razonNoEsProducto: parsed.razonNoEsProducto ?? undefined,
    esManejada: parsed.esManejada !== undefined ? Boolean(parsed.esManejada) : undefined,
    descripcion: String(parsed.descripcion ?? "").trim(),
    tipoTela: parsed.tipoTela ? String(parsed.tipoTela).trim() : undefined,
    telaIdentificada: parsed.telaIdentificada ? String(parsed.telaIdentificada).trim() : undefined,
    colores,
    atributos: Array.isArray(parsed.atributos)
      ? parsed.atributos.map(String)
      : [],
    usosProbables: Array.isArray(parsed.usosProbables)
      ? parsed.usosProbables.map(String)
      : [],
    confianza: clamp01(Number(parsed.confianza ?? 0.5)),
    razonamiento: parsed.razonamiento ? String(parsed.razonamiento).trim() : undefined,
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
    ...({ _error: msg } as any),
  };
}

// ── Construcción del user message enriquecido ─────────────────────

/**
 * Construye el texto que se inyecta al chat como el "user message".
 * G3: usa el schema completo, incluye razonamiento y esManejada.
 */
export function buildEnrichedMessage(
  analysis: VisionAnalysisResult,
  caption: string
): string {
  // Caso: GPT marcó esProducto=false
  if (!analysis.esProducto) {
    const motivo = analysis.razonNoEsProducto
      ? ` (parece ${analysis.razonNoEsProducto})`
      : "";
    return caption.trim()
      ? `El cliente mandó una imagen${motivo} y escribió: "${caption.trim()}". La imagen no parece ser de un producto textil. Pregunta amablemente si puede describir lo que necesita o reenviar otra foto.`
      : `El cliente mandó una imagen pero no parece ser un producto textil${motivo}. Pregunta amablemente qué necesita.`;
  }

  const partes: string[] = [];
  partes.push(`[IMAGEN ANALIZADA por el bot — confianza ${(analysis.confianza * 100).toFixed(0)}%]`);
  partes.push(`Descripción: ${analysis.descripcion}`);

  // Bifurcamos según si la tela es manejada o no
  if (analysis.esManejada === false && analysis.telaIdentificada) {
    partes.push(`⚠️ Tela identificada: ${analysis.telaIdentificada} — Coyote NO maneja esta tela.`);
    if (analysis.razonamiento) {
      partes.push(`Razonamiento: ${analysis.razonamiento}`);
    }
    partes.push("");
    partes.push(
      "INSTRUCCIÓN: Explica al cliente que esa tela específica no la manejamos, pero pregunta si hay alguna alternativa Coyote que pueda servirle (Sportok, Micropique, etc según uso). No inventes que SÍ la tenemos."
    );
  } else {
    if (analysis.tipoTela) {
      partes.push(`Tela del catálogo Coyote: ${analysis.tipoTela}`);
    }
    if (analysis.razonamiento) {
      partes.push(`Razonamiento: ${analysis.razonamiento}`);
    }
    if (analysis.colores.length > 0) {
      partes.push(`Colores: ${analysis.colores.join(", ")}`);
    }
    if (analysis.atributos.length > 0) {
      partes.push(`Atributos: ${analysis.atributos.join(", ")}`);
    }
    if (analysis.usosProbables.length > 0) {
      partes.push(`Usos típicos: ${analysis.usosProbables.join(", ")}`);
    }

    partes.push("");
    partes.push(
      "INSTRUCCIÓN: Usa la descripción y el tipo de tela identificada para responder con seguridad. Si el cliente preguntó precio/disponibilidad, ya tienes la info para responder directamente. Si la confianza es baja (<60%), valida con el cliente: '¿es para X uso o Y uso?'."
    );
  }

  if (caption.trim()) {
    partes.push("");
    partes.push(`El cliente escribió junto a la foto: "${caption.trim()}"`);
  }

  return partes.join("\n");
}