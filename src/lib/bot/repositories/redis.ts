/**
 * Cliente Redis (Upstash) — singleton.
 *
 * En el monolito v1 se instanciaba una nueva conexión por cada request.
 * Aquí lo hacemos una vez por proceso y reutilizamos.
 *
 * Todas las keys del v2 llevan prefijo (ver `keys.ts`) para no chocar con v1.
 */
import { Redis } from "@upstash/redis";
import { getEnv } from "../config/env";

let cached: Redis | null = null;

/**
 * Devuelve el cliente Redis. Lo crea la primera vez y lo reutiliza siempre.
 * Si las credenciales no están bien, falla rápido al primer uso.
 */
export function getRedis(): Redis {
  if (cached) return cached;

  const env = getEnv();
  cached = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
    // Upstash REST tiene retry interno; aquí solo subimos el límite por si hay
    // ráfagas en horas pico.
    retry: {
      retries: 3,
      backoff: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    },
  });
  return cached;
}

/** Solo para tests. Limpia el cliente cacheado. */
export function _resetRedisForTests() {
  cached = null;
}