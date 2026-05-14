/**
 * Endpoint: health check de los servicios del bot.
 *
 * Pinga:
 *  - Redis (Upstash)
 *  - Supabase pgvector (count de embeddings)
 *  - OpenAI (lista modelos disponibles, llamada barata)
 *
 * Devuelve el estado de cada servicio + último timestamp de reindex.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "../_lib/guard";
import { getRedis } from "@/lib/bot/repositories/redis";
import { countEmbeddings } from "@/lib/bot/repositories/vector-repo";
import { getOpenAIClient } from "@/lib/bot/services/openai/client";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/admin/bot/health" });

interface ServiceStatus {
  ok: boolean;
  latencyMs?: number;
  message?: string;
  data?: Record<string, unknown>;
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  const [redisStatus, supabaseStatus, openaiStatus] = await Promise.all([
    checkRedis(),
    checkSupabase(),
    checkOpenAI(),
  ]);

  return NextResponse.json({
    redis: redisStatus,
    supabase: supabaseStatus,
    openai: openaiStatus,
    timestamp: new Date().toISOString(),
  });
}

async function checkRedis(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const redis = getRedis();
    await redis.ping();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn({ err: msg }, "Redis health check failed");
    return { ok: false, message: msg, latencyMs: Date.now() - start };
  }
}

async function checkSupabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const count = await countEmbeddings();
    return {
      ok: true,
      latencyMs: Date.now() - start,
      data: { embeddingsCount: count },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn({ err: msg }, "Supabase health check failed");
    return { ok: false, message: msg, latencyMs: Date.now() - start };
  }
}

async function checkOpenAI(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const client = getOpenAIClient();
    // Llamada baratísima: listar modelos disponibles
    const models = await client.models.list();
    return {
      ok: true,
      latencyMs: Date.now() - start,
      data: { modelsAvailable: models.data?.length ?? 0 },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn({ err: msg }, "OpenAI health check failed");
    return { ok: false, message: msg, latencyMs: Date.now() - start };
  }
}
