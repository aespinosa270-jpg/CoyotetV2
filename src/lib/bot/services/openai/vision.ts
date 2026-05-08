/**
 * Análisis de imágenes con GPT-4o vision.
 *
 * Usado en Fase 7: cliente manda foto de tela del muestrario de un competidor.
 * GPT describe la tela (peso aparente, textura, color, uso). El orquestador
 * luego usa esa descripción para hacer match contra nuestro catálogo
 * (combinación de RAG + matching visual).
 *
 * Soporta entrada:
 *  - imageUrl: URL pública (ej. media de WhatsApp después de descargar)
 *  - imageBase64: bytes en base64 (sin prefijo data:)
 */
import type OpenAI from "openai";
import { getOpenAIClient } from "./client";
import { getEnv } from "../../config/env";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "openai/vision" });

export interface ImageAnalysisRequest {
  /** URL pública o data URL (data:image/jpeg;base64,...). */
  imageUrl?: string;
  /** Base64 sin prefijo. Requiere imageMimeType. */
  imageBase64?: string;
  imageMimeType?: string;
  /** Prompt que guía qué queremos extraer de la imagen. */
  prompt: string;
  model?: string;
  maxTokens?: number;
}

/**
 * Analiza una imagen y devuelve la descripción textual generada por GPT.
 *
 * Si se pasa imageBase64 sin imageMimeType, asumimos image/jpeg.
 */
export async function analyzeImage(
  req: ImageAnalysisRequest,
  client: OpenAI = getOpenAIClient()
): Promise<string> {
  const env = getEnv();
  const model = req.model ?? env.OPENAI_VISION_MODEL;
  const maxTokens = req.maxTokens ?? 500;

  const imageContent = buildImageContent(req);

  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: req.prompt },
          imageContent,
        ],
      },
    ],
  });

  const text = response.choices?.[0]?.message?.content ?? "";
  log.debug(
    { model, hasUrl: !!req.imageUrl, hasBase64: !!req.imageBase64 },
    "Vision analysis completed"
  );
  return typeof text === "string" ? text : "";
}

function buildImageContent(req: ImageAnalysisRequest) {
  if (req.imageUrl) {
    return {
      type: "image_url" as const,
      image_url: { url: req.imageUrl },
    };
  }
  if (req.imageBase64) {
    const mime = req.imageMimeType ?? "image/jpeg";
    return {
      type: "image_url" as const,
      image_url: { url: `data:${mime};base64,${req.imageBase64}` },
    };
  }
  throw new Error("analyzeImage requires either imageUrl or imageBase64");
}
