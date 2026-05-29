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
  // FIX 2026-05: failsafe — si algun mensaje viene sin timestamp,
  // ponemos el ahora. Esto cierra el gap historico del bug que dejaba
  // mensajes sin timestamp y rompia el matcheo con media-repo.
  const nowIso = new Date().toISOString();
  const conTimestamp = mensajes.map((m) =>
    m.timestamp ? m : { ...m, timestamp: nowIso }
  );

  const trimmed =
    conTimestamp.length > MEMORY.MAX_HISTORY_LENGTH
      ? conTimestamp.slice(-MEMORY.MAX_HISTORY_LENGTH)
      : conTimestamp;
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


// ─────────────────────────────────────────────────────────────────────
// ESTADO DE MENSAJE (palomitas WhatsApp): actualiza el status de un
// mensaje saliente en el historial, buscandolo por su waId (wamid de Meta).
// ─────────────────────────────────────────────────────────────────────

type MsgStatus = "sent" | "delivered" | "read" | "failed";

// Jerarquia: nunca retroceder (read > delivered > sent). failed es terminal aparte.
const STATUS_RANK: Record<string, number> = {
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 3,
};

/**
 * Busca el mensaje con waId en el historial del telefono y actualiza
 * su status. Respeta jerarquia (no baja de read a delivered).
 * Devuelve true si encontro y actualizo el mensaje.
 */
export async function updateMessageStatus(
  phone: string,
  waId: string,
  status: MsgStatus,
  redis: Redis = getRedis()
): Promise<boolean> {
  try {
    const historial = await getHistorial(phone, redis);
    if (!historial || historial.length === 0) return false;

    let cambiado = false;
    const actualizado = historial.map((m) => {
      const mm = m as any;
      if (mm.waId !== waId) return m;
      const actual = mm.status as string | undefined;
      // No retroceder de un estado mas avanzado
      if (actual && STATUS_RANK[actual] > STATUS_RANK[status]) return m;
      cambiado = true;
      return { ...mm, status };
    });

    if (!cambiado) return false;

    await redis.set(keys.historial(phone), actualizado, {
      ex: MEMORY.HISTORY_TTL_SECONDS,
    });
    return true;
  } catch (err) {
    log.error({ err, phone, waId }, "Error actualizando status de mensaje");
    return false;
  }
}
