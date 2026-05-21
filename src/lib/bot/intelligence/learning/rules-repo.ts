/**
 * Rules Repository — guarda y lee las reglas aprendidas semana a semana.
 *
 * Storage: Redis con TTL infinito (no se borra solo).
 * Estructura:
 *   v2:learning:rules → JSON array de LearnedRule[]
 *   v2:learning:history → JSON array de WeeklyAnalysis[] (auditoría)
 */
import { getRedis } from "../../repositories/redis";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "intelligence/learning/rules-repo" });

const RULES_KEY = "v2:learning:rules";
const HISTORY_KEY = "v2:learning:history";
const MAX_RULES = 30; // Cap para no inflar el prompt
const MAX_HISTORY = 12; // 3 meses

export interface LearnedRule {
  id: string;          // formato "wk-2026-21-r3"
  semana: string;      // formato "2026-W21" o "14-21 mayo"
  regla: string;       // "SI cliente menciona tergal → ofrecer Sportok"
  evidencia: string;   // qué hecho de la semana la motivó
  fechaAgregada: string; // ISO
  activa: boolean;
}

export interface WeeklyAnalysis {
  id: string;
  semana: string;
  fechaAnalisis: string;
  resumen: string;
  patrones: string[];
  reglasGeneradas: string[]; // IDs de las reglas
  kpis: {
    mensajes: number;
    ventas: number;
    escalaciones: number;
    objecionesTotales: number;
  };
}

// ── Reglas ────────────────────────────────────────────────────────

export async function getLearnedRules(): Promise<LearnedRule[]> {
  try {
    const redis = getRedis();
    const data = await redis.get<LearnedRule[]>(RULES_KEY);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    log.error({ err }, "Error leyendo reglas aprendidas");
    return [];
  }
}

export async function getActiveLearnedRules(): Promise<LearnedRule[]> {
  const all = await getLearnedRules();
  return all.filter((r) => r.activa);
}

export async function addLearnedRules(
  nuevas: Omit<LearnedRule, "id" | "fechaAgregada" | "activa">[]
): Promise<LearnedRule[]> {
  try {
    const redis = getRedis();
    const existing = await getLearnedRules();

    const now = new Date().toISOString();
    const newOnes: LearnedRule[] = nuevas.map((n, idx) => ({
      id: `wk-${Date.now()}-${idx}`,
      semana: n.semana,
      regla: n.regla,
      evidencia: n.evidencia,
      fechaAgregada: now,
      activa: true,
    }));

    // Concat, deduplicar por regla, capear
    const combined = [...newOnes, ...existing];
    const seen = new Set<string>();
    const deduped = combined.filter((r) => {
      const key = r.regla.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const capped = deduped.slice(0, MAX_RULES);

    await redis.set(RULES_KEY, capped);
    log.info({ added: newOnes.length, total: capped.length }, "✅ Reglas aprendidas actualizadas");

    return capped;
  } catch (err) {
    log.error({ err }, "Error guardando reglas");
    return [];
  }
}

export async function toggleRule(id: string, activa: boolean): Promise<boolean> {
  try {
    const redis = getRedis();
    const rules = await getLearnedRules();
    const idx = rules.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    rules[idx].activa = activa;
    await redis.set(RULES_KEY, rules);
    return true;
  } catch (err) {
    log.error({ err, id }, "Error toggling rule");
    return false;
  }
}

export async function deleteRule(id: string): Promise<boolean> {
  try {
    const redis = getRedis();
    const rules = await getLearnedRules();
    const filtered = rules.filter((r) => r.id !== id);
    await redis.set(RULES_KEY, filtered);
    return true;
  } catch (err) {
    log.error({ err, id }, "Error borrando rule");
    return false;
  }
}

// ── Historial de análisis ─────────────────────────────────────────

export async function getAnalysisHistory(): Promise<WeeklyAnalysis[]> {
  try {
    const redis = getRedis();
    const data = await redis.get<WeeklyAnalysis[]>(HISTORY_KEY);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return [];
  }
}

export async function addAnalysis(analysis: WeeklyAnalysis): Promise<void> {
  try {
    const redis = getRedis();
    const existing = await getAnalysisHistory();
    const combined = [analysis, ...existing].slice(0, MAX_HISTORY);
    await redis.set(HISTORY_KEY, combined);
  } catch (err) {
    log.error({ err }, "Error guardando análisis");
  }
}