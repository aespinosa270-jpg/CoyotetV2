/**
 * Registry centralizado de follow-ups enviados por crons.
 *
 * Cada follow-up se guarda en Redis con:
 *   key: v2:followup:<phone>:<tipo>:<timestamp>
 *   value: { tipo, timestamp, mensaje, respondido?: boolean, convertido?: boolean }
 *
 * Y también se mantiene el último de cada tipo en:
 *   key: v2:followup-last:<phone>:<tipo>
 *   value: timestamp ISO del último envío
 *
 * Esto permite:
 *  - Cooldowns por tipo de follow-up
 *  - Métricas: cuántos enviados / respondidos / convertidos
 *  - Histórico visible en CRM
 */
import type { Redis } from "@upstash/redis";
import { getRedis } from "../../repositories/redis";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "followup-repo" });

export type FollowUpTipo =
  | "carrito_abandonado"
  | "reactivacion_fria"
  | "recompra_predictiva";

export interface FollowUpRecord {
  phone: string;
  tipo: FollowUpTipo;
  mensaje: string;
  timestamp: string;
  respondido?: boolean;
  convertido?: boolean;
  contexto?: Record<string, unknown>;
}

// TTL del histórico individual: 90 días
const RECORD_TTL_SEC = 90 * 24 * 60 * 60;
// TTL del "last sent": no expira (lo dejamos como tracking persistente)

function lastKey(phone: string, tipo: FollowUpTipo): string {
  const safe = phone.replace(/[^a-zA-Z0-9_]/g, "");
  return `v2:followup-last:${safe}:${tipo}`;
}

function recordKey(phone: string, tipo: FollowUpTipo, timestamp: string): string {
  const safe = phone.replace(/[^a-zA-Z0-9_]/g, "");
  return `v2:followup:${safe}:${tipo}:${timestamp}`;
}

function indexKey(): string {
  return "v2:followup-index";
}

/**
 * Registra un follow-up enviado. Actualiza también el "last sent" para cooldowns.
 */
export async function registerFollowUp(
  record: Omit<FollowUpRecord, "timestamp">,
  redis: Redis = getRedis()
): Promise<FollowUpRecord> {
  const fullRecord: FollowUpRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };

  try {
    // Guardar registro individual con TTL
    await redis.set(
      recordKey(record.phone, record.tipo, fullRecord.timestamp),
      fullRecord,
      { ex: RECORD_TTL_SEC }
    );

    // Actualizar "last sent" (sin TTL, persistente)
    await redis.set(lastKey(record.phone, record.tipo), fullRecord.timestamp);

    // Agregar al índice global (sorted set por timestamp para listado en CRM)
    await redis.zadd(indexKey(), {
      score: Date.now(),
      member: `${record.phone}:${record.tipo}:${fullRecord.timestamp}`,
    });

    log.info(
      { phone: record.phone, tipo: record.tipo },
      "Follow-up registrado"
    );
  } catch (err) {
    log.warn({ err, record }, "Error registrando follow-up");
  }

  return fullRecord;
}

/**
 * Devuelve fecha ISO del último follow-up de ese tipo para ese cliente, o null.
 */
export async function getLastFollowUp(
  phone: string,
  tipo: FollowUpTipo,
  redis: Redis = getRedis()
): Promise<string | null> {
  try {
    return await redis.get<string>(lastKey(phone, tipo));
  } catch {
    return null;
  }
}

/**
 * Verifica si el cliente recibió CUALQUIER follow-up en últimos N días.
 * Usado para anti-spam global.
 */
export async function hasFollowUpInLastDays(
  phone: string,
  days: number,
  redis: Redis = getRedis()
): Promise<boolean> {
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const tipos: FollowUpTipo[] = [
    "carrito_abandonado",
    "reactivacion_fria",
    "recompra_predictiva",
  ];
  for (const tipo of tipos) {
    const lastIso = await getLastFollowUp(phone, tipo, redis);
    if (lastIso) {
      const lastMs = new Date(lastIso).getTime();
      if (lastMs > cutoffMs) return true;
    }
  }
  return false;
}

/**
 * Marca un follow-up como respondido (llamado desde inbound.ts cuando el
 * cliente responde después de un envío).
 */
export async function markFollowUpResponded(
  phone: string,
  redis: Redis = getRedis()
): Promise<void> {
  // Marcamos el último de cualquier tipo en últimos 7 días
  const cutoffMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const tipos: FollowUpTipo[] = [
    "carrito_abandonado",
    "reactivacion_fria",
    "recompra_predictiva",
  ];
  for (const tipo of tipos) {
    const lastIso = await getLastFollowUp(phone, tipo, redis);
    if (!lastIso) continue;
    const lastMs = new Date(lastIso).getTime();
    if (lastMs <= cutoffMs) continue;

    try {
      const key = recordKey(phone, tipo, lastIso);
      const record = await redis.get<FollowUpRecord>(key);
      if (record && !record.respondido) {
        await redis.set(key, { ...record, respondido: true }, { ex: RECORD_TTL_SEC });
      }
    } catch (err) {
      log.warn({ err, phone, tipo }, "No se pudo marcar follow-up como respondido");
    }
  }
}

/**
 * Lista los follow-ups recientes (ordenados por más reciente).
 * Usado por el page de CRM.
 */
export async function listRecentFollowUps(
  limit = 200,
  redis: Redis = getRedis()
): Promise<FollowUpRecord[]> {
  try {
    const indexMembers = await redis.zrange<string[]>(
      indexKey(),
      0,
      limit - 1,
      { rev: true }
    );

    if (!indexMembers || indexMembers.length === 0) return [];

    const records: FollowUpRecord[] = [];
    for (const member of indexMembers) {
      const [phone, tipo, timestamp] = member.split(":");
      try {
        const r = await redis.get<FollowUpRecord>(
          recordKey(phone, tipo as FollowUpTipo, timestamp)
        );
        if (r) records.push(r);
      } catch {
        // Skip si no se puede leer
      }
    }
    return records;
  } catch (err) {
    log.warn({ err }, "Error listando follow-ups recientes");
    return [];
  }
}

/**
 * Devuelve KPIs agregados: total enviados / respondidos / convertidos por tipo.
 */
export async function getFollowUpStats(
  redis: Redis = getRedis()
): Promise<{
  total: number;
  porTipo: Record<FollowUpTipo, { enviados: number; respondidos: number; convertidos: number }>;
}> {
  const records = await listRecentFollowUps(1000, redis);
  const porTipo: any = {
    carrito_abandonado: { enviados: 0, respondidos: 0, convertidos: 0 },
    reactivacion_fria: { enviados: 0, respondidos: 0, convertidos: 0 },
    recompra_predictiva: { enviados: 0, respondidos: 0, convertidos: 0 },
  };
  for (const r of records) {
    if (!porTipo[r.tipo]) continue;
    porTipo[r.tipo].enviados++;
    if (r.respondido) porTipo[r.tipo].respondidos++;
    if (r.convertido) porTipo[r.tipo].convertidos++;
  }
  return { total: records.length, porTipo };
}