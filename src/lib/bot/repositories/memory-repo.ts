/**
 * Repository de memoria episódica del cliente.
 *
 * Guarda los hechos en una key por teléfono, con TTL largo (1 año por default
 * — la memoria sí debe durar a través de conversaciones distantes).
 */
import type { Redis } from "@upstash/redis";
import { getRedis } from "./redis";
import { keys } from "./keys";
import { getLogger } from "../observability/logger";
import {
  MAX_HECHOS,
  type HechoEpisodico,
  type MemoriaEpisodica,
} from "../intelligence/memory/types";

const log = getLogger({ module: "memory-repo" });

const TTL_SECONDS = 60 * 60 * 24 * 365; // 1 año

const EMPTY: MemoriaEpisodica = {
  hechos: [],
  ultimaActualizacion: new Date(0).toISOString(),
};

// ── Lectura ───────────────────────────────────────────────────────

export async function getMemoria(
  phone: string,
  redis: Redis = getRedis()
): Promise<MemoriaEpisodica> {
  try {
    const data = await redis.get<MemoriaEpisodica>(keys.memoria(phone));
    if (!data) return { ...EMPTY };
    return {
      hechos: Array.isArray(data.hechos) ? data.hechos : [],
      ultimaActualizacion: data.ultimaActualizacion ?? EMPTY.ultimaActualizacion,
    };
  } catch (err) {
    log.error({ err, phone }, "Error leyendo memoria episódica");
    return { ...EMPTY };
  }
}

// ── Escritura ─────────────────────────────────────────────────────

export async function saveMemoria(
  phone: string,
  hechos: HechoEpisodico[],
  redis: Redis = getRedis()
): Promise<MemoriaEpisodica> {
  const capped = hechos.slice(0, MAX_HECHOS);
  const memoria: MemoriaEpisodica = {
    hechos: capped,
    ultimaActualizacion: new Date().toISOString(),
  };

  await redis.set(keys.memoria(phone), memoria, { ex: TTL_SECONDS });
  log.info({ phone, count: capped.length }, "Memoria episódica guardada");
  return memoria;
}

export async function clearMemoria(
  phone: string,
  redis: Redis = getRedis()
): Promise<boolean> {
  const count = await redis.del(keys.memoria(phone));
  return count > 0;
}
