/**
 * Embeddings (text-embedding-3-small por default).
 *
 * Convierten texto a vectores de 1536 dimensiones que podemos guardar en
 * pgvector y comparar por similitud de coseno.
 *
 * Uso típico (Fase 6): generamos un embedding por producto del catálogo y
 * los guardamos. Cuando llega un mensaje del cliente, generamos su
 * embedding y buscamos los k productos más similares.
 */
import type OpenAI from "openai";
import { getOpenAIClient } from "./client";
import { getEnv } from "../../config/env";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "openai/embeddings" });

/**
 * Genera un embedding para un único texto.
 */
export async function getEmbedding(
  text: string,
  client: OpenAI = getOpenAIClient()
): Promise<number[]> {
  const env = getEnv();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Cannot embed empty text");
  }

  const response = await client.embeddings.create({
    model: env.OPENAI_EMBEDDING_MODEL,
    input: trimmed,
  });

  const vector = response.data?.[0]?.embedding;
  if (!vector) {
    log.error({ response }, "Embedding response sin vector");
    throw new Error("Empty embedding response");
  }
  return vector;
}

/**
 * Genera embeddings para múltiples textos en una sola llamada (más barato y
 * más rápido que llamar `getEmbedding` en loop).
 *
 * El orden de salida matchea el orden de entrada.
 */
export async function getEmbeddingsBatch(
  texts: string[],
  client: OpenAI = getOpenAIClient()
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const env = getEnv();

  // Filtramos textos vacíos pero mantenemos posiciones
  const cleaned = texts.map((t) => t.trim());
  if (cleaned.some((t) => !t)) {
    throw new Error("Cannot embed empty text in batch");
  }

  const response = await client.embeddings.create({
    model: env.OPENAI_EMBEDDING_MODEL,
    input: cleaned,
  });

  // OpenAI puede regresar los embeddings en cualquier orden; usamos `index`
  // para reordenar.
  const data = response.data ?? [];
  const sorted = [...data].sort((a, b) => a.index - b.index);
  if (sorted.length !== cleaned.length) {
    log.error(
      { expected: cleaned.length, got: sorted.length },
      "Batch embedding count mismatch"
    );
    throw new Error("Embedding batch size mismatch");
  }
  return sorted.map((d) => d.embedding);
}
