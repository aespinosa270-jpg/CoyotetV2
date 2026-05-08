/**
 * Repository de conversación.
 *
 * Maneja:
 *  - Historial de mensajes por cliente (compactado a últimos 80, TTL 90 días).
 *  - Resumen semántico (regenerado cada N mensajes por el motor de IA).
 */
import type { Redis } from "@upstash/redis";
import { getRedis } from "./redis";
import { keys } from "./keys";
import { MEMORY } from "../config/constants";
import { getLogger } from "../observability/logger";
import type { MensajeHistorial } from "../types/domain";

const log = getLogger({ module: "conversation-repo" });

// ── Historial ──────────────────────────────────────────────────────

export async function getHistorial(
  phone: string,
  redis: Redis = getRedis()
): Promise<MensajeHistorial[]> {
  try {
    const data = await redis.get<MensajeHistorial[]>(keys.historial(phone));
    return data ?? [];
  } catch (err) {
    log.error({ err, phone }, "Error leyendo historial");
    return [];
  }
}

/**
 * Reemplaza el historial completo. Aplica compactación (últimos N) y TTL.
 * Ideal para cuando ya tienes el array final en memoria.
 */
export async function saveHistorial(
  phone: string,
  mensajes: MensajeHistorial[],
  redis: Redis = getRedis()
): Promise<MensajeHistorial[]> {
  const trimmed =
    mensajes.length > MEMORY.MAX_HISTORY_LENGTH
      ? mensajes.slice(-MEMORY.MAX_HISTORY_LENGTH)
      : mensajes;
  await redis.set(keys.historial(phone), trimmed, {
    ex: MEMORY.HISTORY_TTL_SECONDS,
  });
  return trimmed;
}

/**
 * Append optimizado: lee el historial actual, agrega los nuevos mensajes y
 * guarda. NO es atómico, pero el riesgo es bajo (el mismo cliente no manda
 * mensajes en paralelo).
 */
export async function appendMensajes(
  phone: string,
  nuevos: MensajeHistorial[],
  redis: Redis = getRedis()
): Promise<MensajeHistorial[]> {
  if (nuevos.length === 0) return getHistorial(phone, redis);
  const current = await getHistorial(phone, redis);
  const merged = [...current, ...nuevos];
  return saveHistorial(phone, merged, redis);
}

export async function appendMensaje(
  phone: string,
  mensaje: MensajeHistorial,
  redis: Redis = getRedis()
): Promise<MensajeHistorial[]> {
  return appendMensajes(phone, [mensaje], redis);
}

export async function clearHistorial(
  phone: string,
  redis: Redis = getRedis()
): Promise<boolean> {
  const count = await redis.del(keys.historial(phone));
  return count > 0;
}

// ── Resumen semántico ──────────────────────────────────────────────

export async function getResumen(
  phone: string,
  redis: Redis = getRedis()
): Promise<string | null> {
  try {
    const data = await redis.get<string>(keys.resumenSemantico(phone));
    return data ?? null;
  } catch (err) {
    log.error({ err, phone }, "Error leyendo resumen");
    return null;
  }
}

export async function setResumen(
  phone: string,
  resumen: string,
  redis: Redis = getRedis()
): Promise<void> {
  await redis.set(keys.resumenSemantico(phone), resumen, {
    ex: MEMORY.HISTORY_TTL_SECONDS,
  });
}

/**
 * Decide si toca regenerar el resumen basado en el tamaño actual del historial.
 * Política: cada 10 mensajes (cuando length % 10 === 0 ó length % 10 === 1).
 */
export function debeRegenerarResumen(historialLength: number): boolean {
  if (historialLength < 5) return false;
  const mod = historialLength % MEMORY.SEMANTIC_SUMMARY_INTERVAL;
  return mod === 0 || mod === 1;
}
