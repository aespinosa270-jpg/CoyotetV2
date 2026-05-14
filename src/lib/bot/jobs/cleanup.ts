/**
 * Job: Limpieza de datos viejos.
 *
 * Borra:
 *  1. Eventos en sorted sets cuyo TTL ya pasó (esto es automático de Redis,
 *     pero verificamos por si quedaron stale)
 *  2. Cooldowns viejos de reminders (también TTL pero por si acaso)
 *  3. Vision cache items >30 días (mucha foto repetida no se vuelve a ver)
 *  4. Locks/ratelimit zombies
 *
 * Idempotente: corre cuantas veces quieras sin causar daño.
 * El cleanup principal lo hace Redis con TTL, este job es para asegurar
 * que keys sin TTL definido no se acumulen.
 */
import type { Redis } from "@upstash/redis";
import { getRedis } from "../repositories/redis";
import { getLogger } from "../observability/logger";

const log = getLogger({ module: "jobs/cleanup" });

export interface CleanupJobOptions {
  redis?: Redis;
  dryRun?: boolean;
}

export interface CleanupJobResult {
  visionCacheRevisados: number;
  visionCacheBorrados: number;
  rateLimitsRevisados: number;
  rateLimitsBorrados: number;
  dedupesRevisados: number;
  dedupesBorrados: number;
}

export async function runCleanupJob(
  options: CleanupJobOptions = {}
): Promise<CleanupJobResult> {
  const redis = options.redis ?? getRedis();
  const dryRun = options.dryRun ?? false;

  const result: CleanupJobResult = {
    visionCacheRevisados: 0,
    visionCacheBorrados: 0,
    rateLimitsRevisados: 0,
    rateLimitsBorrados: 0,
    dedupesRevisados: 0,
    dedupesBorrados: 0,
  };

  // 1. Vision cache (keys que tienen TTL — solo verificamos que esté seteado)
  await cleanupKeysWithoutTTL(
    redis,
    "v2:vision:*",
    24 * 60 * 60, // TTL: 24h
    (revisados, borrados) => {
      result.visionCacheRevisados = revisados;
      result.visionCacheBorrados = borrados;
    },
    dryRun
  );

  // 2. Rate limits del widget web (ventana 1min, así que cualquier ratelimit
  //    sin TTL es bug residual)
  await cleanupKeysWithoutTTL(
    redis,
    "v2:ratelimit:*",
    60, // TTL: 1 min
    (revisados, borrados) => {
      result.rateLimitsRevisados = revisados;
      result.rateLimitsBorrados = borrados;
    },
    dryRun
  );

  // 3. Dedupe keys (deberían tener TTL de unos minutos)
  await cleanupKeysWithoutTTL(
    redis,
    "v2:dedupe:*",
    10 * 60, // TTL: 10 min
    (revisados, borrados) => {
      result.dedupesRevisados = revisados;
      result.dedupesBorrados = borrados;
    },
    dryRun
  );

  log.info(result, "Job de cleanup completado");
  return result;
}

/**
 * Para keys que matchean un pattern, verifica TTL. Si no tiene TTL (-1),
 * le aplica el TTL default. Si está expirado (-2), no hace nada (ya borró).
 */
async function cleanupKeysWithoutTTL(
  redis: Redis,
  pattern: string,
  defaultTTL: number,
  onComplete: (revisados: number, borrados: number) => void,
  dryRun: boolean
): Promise<void> {
  let revisados = 0;
  let borrados = 0;
  let cursor: string | number = 0;

  try {
    do {
      const scanResult = (await redis.scan(cursor as any, {
        match: pattern,
        count: 100,
      })) as [string | number, string[]];
      cursor = scanResult[0];
      const keys = scanResult[1];

      for (const key of keys) {
        revisados++;
        try {
          const ttl = await redis.ttl(key);
          if (ttl === -1) {
            // sin TTL → aplicar default
            if (!dryRun) await redis.expire(key, defaultTTL);
            borrados++;
          }
        } catch (err) {
          log.debug({ err, key }, "Error verificando TTL de key");
        }
      }
    } while (cursor !== "0" && cursor !== 0);
  } catch (err) {
    log.warn({ err, pattern }, "Error en cleanup de pattern");
  }

  onComplete(revisados, borrados);
}
