/**
 * Repository de vectores en Supabase pgvector.
 *
 * Encapsula TODOS los accesos a la tabla `bot_catalog_embeddings` y a las
 * funciones RPC creadas en MIGRATION.sql. Si el día de mañana decides
 * mover los embeddings a Pinecone o Upstash Vector, solo cambias este
 * archivo.
 *
 * El cliente Supabase se inyecta como parámetro opcional para testabilidad
 * — mismo patrón que client-repo con Redis.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "../config/env";
import { getLogger } from "../observability/logger";

const log = getLogger({ module: "vector-repo" });

// ── Cliente singleton ──────────────────────────────────────────────

let cached: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cached) return cached;
  const env = getEnv();
  // Usamos service_role para escribir embeddings (eludiendo RLS).
  // Si tu env aún no lo tiene, agrega SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
  const url = (env as any).NEXT_PUBLIC_SUPABASE_URL ?? (env as any).SUPABASE_URL ?? "";
  const key = (env as any).SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) {
    throw new Error(
      "vector-repo requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env"
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function _resetSupabaseClientForTests() {
  cached = null;
}

// ── Tipos ──────────────────────────────────────────────────────────

export interface CatalogEmbedding {
  productId: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export interface VectorSearchResult {
  productId: string;
  content: string;
  similarity: number;
  matchType?: "vector" | "exact";
  metadata?: Record<string, unknown>;
}

// ── UPSERT (indexar) ───────────────────────────────────────────────

export async function upsertEmbedding(
  embedding: CatalogEmbedding,
  client: SupabaseClient = getSupabaseClient()
): Promise<void> {
  const { error } = await client.from("bot_catalog_embeddings").upsert(
    {
      product_id: embedding.productId,
      content: embedding.content,
      embedding: embedding.embedding,
      metadata: embedding.metadata ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "product_id" }
  );
  if (error) {
    log.error({ err: error, productId: embedding.productId }, "Upsert failed");
    throw new Error(`Vector upsert failed: ${error.message}`);
  }
}

export async function upsertEmbeddingsBatch(
  embeddings: CatalogEmbedding[],
  client: SupabaseClient = getSupabaseClient()
): Promise<number> {
  if (embeddings.length === 0) return 0;
  const rows = embeddings.map((e) => ({
    product_id: e.productId,
    content: e.content,
    embedding: e.embedding,
    metadata: e.metadata ?? {},
    updated_at: new Date().toISOString(),
  }));

  const { error } = await client
    .from("bot_catalog_embeddings")
    .upsert(rows, { onConflict: "product_id" });

  if (error) {
    log.error({ err: error, count: rows.length }, "Batch upsert failed");
    throw new Error(`Vector batch upsert failed: ${error.message}`);
  }
  return rows.length;
}

// ── Búsqueda ──────────────────────────────────────────────────────

/** Búsqueda vectorial pura por similitud de coseno. */
export async function searchVector(
  queryEmbedding: number[],
  options: { matchThreshold?: number; matchCount?: number } = {},
  client: SupabaseClient = getSupabaseClient()
): Promise<VectorSearchResult[]> {
  const { matchThreshold = 0.5, matchCount = 5 } = options;

  const { data, error } = await client.rpc("match_catalog", {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    log.error({ err: error }, "Vector search failed");
    return [];
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    productId: String(r.product_id),
    content: String(r.content),
    similarity: Number(r.similarity),
    metadata: (r.metadata as Record<string, unknown>) ?? {},
  }));
}

/** Búsqueda híbrida: vectorial + texto exacto. */
export async function searchHybrid(
  queryEmbedding: number[],
  queryText: string,
  options: { matchThreshold?: number; matchCount?: number } = {},
  client: SupabaseClient = getSupabaseClient()
): Promise<VectorSearchResult[]> {
  const { matchThreshold = 0.5, matchCount = 5 } = options;

  const { data, error } = await client.rpc("match_catalog_hybrid", {
    query_embedding: queryEmbedding,
    query_text: queryText,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    log.error({ err: error }, "Hybrid search failed");
    return [];
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    productId: String(r.product_id),
    content: String(r.content),
    similarity: Number(r.similarity),
    matchType: (r.match_type as "vector" | "exact") ?? "vector",
    metadata: (r.metadata as Record<string, unknown>) ?? {},
  }));
}

// ── Limpieza ──────────────────────────────────────────────────────

export async function clearAllEmbeddings(
  client: SupabaseClient = getSupabaseClient()
): Promise<void> {
  const { error } = await client.rpc("clear_catalog_embeddings");
  if (error) {
    log.error({ err: error }, "Clear failed");
    throw new Error(`Clear failed: ${error.message}`);
  }
}

export async function deleteEmbedding(
  productId: string,
  client: SupabaseClient = getSupabaseClient()
): Promise<void> {
  const { error } = await client
    .from("bot_catalog_embeddings")
    .delete()
    .eq("product_id", productId);
  if (error) {
    log.error({ err: error, productId }, "Delete failed");
    throw new Error(`Delete failed: ${error.message}`);
  }
}

export async function countEmbeddings(
  client: SupabaseClient = getSupabaseClient()
): Promise<number> {
  const { count, error } = await client
    .from("bot_catalog_embeddings")
    .select("*", { count: "exact", head: true });
  if (error) {
    log.error({ err: error }, "Count failed");
    return 0;
  }
  return count ?? 0;
}

