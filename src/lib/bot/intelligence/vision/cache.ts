/**
 * Cache de análisis visuales en Redis.
 *
 * Las fotos en WhatsApp con frecuencia son forwards o re-envíos. Reanalizar
 * la misma foto cuesta ~$0.003 por llamada a GPT-4o vision. Con un cache
 * trivial por hash, evitamos pagar dos veces por la misma imagen.
 *
 * Estrategia:
 *  - Key: media:vision:{sha256} (o media:vision:{nativeId} si no hay sha256)
 *  - TTL: 24h (las fotos se reenvian más en la primera ventana)
 *  - Value: VisionAnalysisResult serializado
 */
import type { Redis } from "@upstash/redis";
import { getRedis } from "../../repositories/redis";
import { getLogger } from "../../observability/logger";
import type { VisionAnalysisResult } from "./types";

const log = getLogger({ module: "vision/cache" });

const TTL_SECONDS = 60 * 60 * 24; // 24h
const KEY_PREFIX = "v2:vision:";

function buildKey(hash: string): string {
  return `${KEY_PREFIX}${hash}`;
}

// ── Lectura ───────────────────────────────────────────────────────

export async function getCachedAnalysis(
  hash: string,
  redis: Redis = getRedis()
): Promise<VisionAnalysisResult | null> {
  try {
    const data = await redis.get<VisionAnalysisResult>(buildKey(hash));
    if (data) {
      log.debug({ hash: hash.slice(0, 12) }, "Vision cache HIT");
    }
    return data ?? null;
  } catch (err) {
    log.warn({ err }, "Vision cache read failed (continuamos sin cache)");
    return null;
  }
}

// ── Escritura ─────────────────────────────────────────────────────

export async function setCachedAnalysis(
  hash: string,
  result: VisionAnalysisResult,
  redis: Redis = getRedis()
): Promise<void> {
  try {
    await redis.set(buildKey(hash), result, { ex: TTL_SECONDS });
    log.debug({ hash: hash.slice(0, 12) }, "Vision cache stored");
  } catch (err) {
    // Fail-open: si el cache falla, igual se devolvió el análisis al cliente
    log.warn({ err }, "Vision cache write failed (no crítico)");
  }
}
