/**
 * Sistema de eventos para observabilidad del bot.
 *
 * Guarda eventos críticos en Redis sorted sets organizados por día.
 * Permite:
 *  - Gráficos históricos en /crm/admin/bot/metricas
 *  - Auditoría de qué pasó en la conversación de un cliente específico
 *  - Detectar patrones (qué hora tiene más errores, etc.)
 *
 * Keys:
 *   v2:events:{tipo}:{YYYY-MM-DD}   sorted set (score=timestamp ms)
 *
 * TTL: 30 días para no llenar Redis. Si necesitas histórico más largo,
 * el job de cleanup puede exportar a Postgres o S3 antes de borrar.
 */
import type { Redis } from "@upstash/redis";
import { getRedis } from "../repositories/redis";
import { getLogger } from "./logger";

const log = getLogger({ module: "events" });

// Contador global para garantizar unicidad de members en sorted sets
let __eventCounter = 0;

const EVENT_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 días

export type EventType =
  | "message"          // mensaje procesado (cualquier canal)
  | "conversion"       // se generó un link de pago / pedido
  | "error"            // error en el orchestrator
  | "hallucination"    // validator anti-invención cachó algo
  | "vision"           // foto analizada
  | "objection"        // objeción detectada
  | "rag_used"         // RAG se usó en lugar de catálogo completo
  | "reminder_sent"    // job de cron envió recordatorio
  | "reactivation_sent"; // job de cron envió reactivación

export interface BotEvent {
  type: EventType;
  /** Identificador del cliente (phone, web:uuid, tg:id, ig:id, etc.) */
  clientId?: string;
  /** Canal donde ocurrió */
  channel?: string;
  /** Detalles libres (latencia, tipo de objeción, descripción de error, etc.) */
  data?: Record<string, unknown>;
  /** Timestamp en ms — si no se pasa, se usa Date.now() */
  timestamp?: number;
}

// ── Keys ──────────────────────────────────────────────────────────

function buildKey(type: EventType, date: Date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `v2:events:${type}:${yyyy}-${mm}-${dd}`;
}

// ── Escritura (fail-open) ─────────────────────────────────────────

/**
 * Registra un evento. NO bloquea ni tira si Redis falla — los eventos
 * son best-effort. La operación principal del bot debe continuar siempre.
 */
export async function recordEvent(
  event: BotEvent,
  redis: Redis = getRedis()
): Promise<void> {
  const ts = event.timestamp ?? Date.now();
  const key = buildKey(event.type, new Date(ts));

  __eventCounter++;
  const uniqueSuffix = __eventCounter.toString(36);
  const payload = JSON.stringify({
    type: event.type,
    clientId: event.clientId,
    channel: event.channel,
    data: event.data,
    ts,
    _u: uniqueSuffix,
  });

  try {
    // zadd: score = timestamp, member = JSON
    await redis.zadd(key, { score: ts, member: payload });
    // TTL solo se setea la primera vez por clave
    await redis.expire(key, EVENT_TTL_SECONDS);
  } catch (err) {
    log.warn(
      { err, type: event.type },
      "Falló registro de evento — continuando sin observabilidad"
    );
  }
}

// ── Lectura ───────────────────────────────────────────────────────

/**
 * Cuenta eventos de un tipo en una fecha específica.
 */
export async function countEventsForDay(
  type: EventType,
  date: Date,
  redis: Redis = getRedis()
): Promise<number> {
  try {
    const count = await redis.zcard(buildKey(type, date));
    return count ?? 0;
  } catch (err) {
    log.warn({ err, type }, "Error contando eventos");
    return 0;
  }
}

/**
 * Devuelve los conteos para los últimos N días de un tipo.
 * Array ordenado del más antiguo al más reciente.
 *
 * Retorno: [{date: "2026-05-01", count: 42}, ...]
 */
export async function getDailyCounts(
  type: EventType,
  days: number = 30,
  redis: Redis = getRedis()
): Promise<Array<{ date: string; count: number }>> {
  const today = new Date();
  const results: Array<{ date: string; count: number }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const count = await countEventsForDay(type, d, redis);
    const iso = d.toISOString().slice(0, 10);
    results.push({ date: iso, count });
  }

  return results;
}

/**
 * Devuelve los eventos crudos de un día específico (para drill-down).
 * Limit por default 100, ordenado del más reciente al más viejo.
 */
export async function getRecentEvents(
  type: EventType,
  date: Date = new Date(),
  limit: number = 100,
  redis: Redis = getRedis()
): Promise<BotEvent[]> {
  try {
    const key = buildKey(type, date);
    // zrange con rev=true devuelve del score más alto al más bajo
    const raw = await redis.zrange(key, 0, limit - 1, { rev: true });
    return (raw as string[])
      .map((s) => {
        try {
          return JSON.parse(s) as BotEvent;
        } catch {
          return null;
        }
      })
      .filter((e): e is BotEvent => e !== null);
  } catch (err) {
    log.warn({ err, type }, "Error leyendo eventos");
    return [];
  }
}

// ── Helpers de conveniencia ───────────────────────────────────────

export async function recordMessage(
  clientId: string,
  channel: string,
  data?: Record<string, unknown>
): Promise<void> {
  await recordEvent({ type: "message", clientId, channel, data });
}

export async function recordError(
  message: string,
  clientId?: string,
  channel?: string,
  extra?: Record<string, unknown>
): Promise<void> {
  await recordEvent({
    type: "error",
    clientId,
    channel,
    data: { message, ...extra },
  });
}

export async function recordConversion(
  clientId: string,
  channel: string,
  amount?: number,
  paymentMethod?: string
): Promise<void> {
  await recordEvent({
    type: "conversion",
    clientId,
    channel,
    data: { amount, paymentMethod },
  });
}



