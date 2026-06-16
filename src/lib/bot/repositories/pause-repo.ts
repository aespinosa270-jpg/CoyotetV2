/**
 * Repository del estado "bot pausado" por conversación.
 *
 * Cuando un admin toma control humano de una conversación, se setea un flag
 * en Redis con TTL de 23 horas. Cada mensaje que el admin envíe RENUEVA el
 * TTL para que el bot no regrese en medio de una conversación humana activa.
 *
 * Cuando expira el TTL (23h sin mensaje del admin), el bot reanuda
 * automáticamente.
 *
 * Modelo del valor guardado:
 *   {
 *     pausedAt:    ISO (cuándo se pausó por primera vez)
 *     pausedBy:    email del admin que tomó control
 *     lastAgentMessageAt: ISO (último mensaje del agente — renueva el TTL)
 *   }
 */
import type { Redis } from "@upstash/redis";
import { getRedis } from "./redis";
import { keys } from "./keys";
import { getLogger } from "../observability/logger";

const log = getLogger({ module: "pause-repo" });

const TTL_SECONDS = 60 * 60 * 2; // 2 horas (antes 23h: apagaba el bot todo el dia y mataba ventas)

export interface PauseState {
  pausedAt: string;
  pausedBy: string;
  lastAgentMessageAt: string;
}

// ─── Lectura ─────────────────────────────────────────────────────────────────

export async function getPauseState(
  phone: string,
  redis: Redis = getRedis()
): Promise<PauseState | null> {
  try {
    const data = await redis.get<PauseState>(keys.botPaused(phone));
    return data ?? null;
  } catch (err) {
    log.error({ err, phone }, "Error leyendo pause state");
    return null;
  }
}

export async function isBotPaused(
  phone: string,
  redis: Redis = getRedis()
): Promise<boolean> {
  const state = await getPauseState(phone, redis);
  return state !== null;
}

/**
 * Devuelve segundos restantes hasta que el bot reanude (TTL del flag).
 * Si no está pausado, devuelve 0.
 */
export async function getPauseTTL(
  phone: string,
  redis: Redis = getRedis()
): Promise<number> {
  try {
    const ttl = await redis.ttl(keys.botPaused(phone));
    return ttl > 0 ? ttl : 0;
  } catch {
    return 0;
  }
}

// ─── Escritura ───────────────────────────────────────────────────────────────

/**
 * Pausa el bot para esta conversación. TTL inicial de 23h.
 */
export async function pauseBot(
  phone: string,
  adminEmail: string,
  redis: Redis = getRedis()
): Promise<PauseState> {
  const now = new Date().toISOString();
  const state: PauseState = {
    pausedAt: now,
    pausedBy: adminEmail,
    lastAgentMessageAt: now,
  };
  await redis.set(keys.botPaused(phone), state, { ex: TTL_SECONDS });
  log.info({ phone, adminEmail }, "Bot PAUSADO — control humano tomado");
  return state;
}

/**
 * Renueva el TTL del pause cada vez que el agente manda un mensaje.
 * Mantiene los mismos `pausedAt` y `pausedBy` originales.
 */
export async function renewPause(
  phone: string,
  redis: Redis = getRedis()
): Promise<void> {
  const current = await getPauseState(phone, redis);
  if (!current) {
    log.warn({ phone }, "renewPause llamado pero no había pause activa");
    return;
  }
  const renewed: PauseState = {
    ...current,
    lastAgentMessageAt: new Date().toISOString(),
  };
  await redis.set(keys.botPaused(phone), renewed, { ex: TTL_SECONDS });
}

/**
 * Libera el control. El bot reanuda inmediatamente.
 */
export async function unpauseBot(
  phone: string,
  redis: Redis = getRedis()
): Promise<boolean> {
  const count = await redis.del(keys.botPaused(phone));
  if (count > 0) {
    log.info({ phone }, "Bot REANUDADO — control humano liberado");
  }
  return count > 0;
}
