/**
 * Detector de razones de escalación.
 *
 * Implementa los 6 triggers definidos por Jack:
 *   A. Quejas / molestia explícita
 *   B. Petición humano
 *   C. Alto valor (>300 kg o >$30,000)
 *   D. Retries del bot (hallucinations recurrentes)
 *   E. Frustración por repetición
 *   F. Facturación compleja
 *
 * Cada detector retorna un DetectionResult independiente. El orchestrator
 * llama a `detectAllReasons(...)` que retorna la PRIMERA razón con la
 * severidad más alta.
 */
import type { Redis } from "@upstash/redis";
import type { DetectionResult, RazonEscalacion } from "./types";

// ─── A. Quejas / molestia ────────────────────────────────────────────────────

const QUEJAS_PATTERNS: RegExp[] = [
  /\b(estafa|fraude|robar(on)?|denuncia(r)?|profeco|condusef|abogad[oa]|demanda(r)?)\b/i,
  /\b(mala\s+atenci[oó]n|p[eé]simo|horrible|asco|basura|verg[üu]enza)\b/i,
  /\b(enojad[oa]|molest[oa]|furios[oa]|hart[oa]|cansad[oa]\s+de)\b/i,
  /quiero\s+(hablar|comunicarme)\s+con\s+(el\s+)?(due[ñn]o|due[ñn]a|jefe|gerente|encargad)/i,
  /(esto\s+es\s+un\s+(fraude|robo|abuso))/i,
  /\b(reclam[oa]|reclamaci[oó]n|me\s+enga[ñn]aron)\b/i,
];

function detectarQueja(text: string): DetectionResult {
  for (const pattern of QUEJAS_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      return {
        detected: true,
        razon: "queja",
        contexto: match[0],
        severity: "high",
      };
    }
  }
  return { detected: false };
}

// ─── B. Petición de humano ───────────────────────────────────────────────────

const HUMANO_PATTERNS: RegExp[] = [
  // Originales
  /\b(asesor|agente|persona|humano|alguien)\s+(real|de\s+verdad|verdadero)\b/i,
  /\b(con\s+(un\s+)?(supervisor|humano|persona|asesor|gerente))\b/i,
  /\b(quiero\s+hablar\s+con\s+(alguien|un\s+humano|una\s+persona))/i,
  /\b(no\s+(entiend|resuel)|no\s+me\s+est[aá]s?\s+entendi)/i,
  /\b(otra\s+persona|otro\s+asesor)\b/i,
  /\b(eres\s+un\s+(bot|robot|m[aá]quina))/i,
  // NUEVO: ejecutiv*, encargad*, jefe, dueño, atención humana, etc.
  /\b(ejecutiv[oa]s?|encargad[oa]s?|due[ñn][oa]|jef[ea])\b/i,
  /\b(hablar\s+con\s+(una?\s+)?(ejecutiv|encargad|jef|due|gerent|supervis|coordinad|representant|director))/i,
  /\b(comuni(que|car|c[aá]me)me?\s+con)/i,
  /\b(quiero\s+(que\s+me\s+)?(atiend|hable|contact|llame|marqu))/i,
  /\b(me\s+(atiend|llame|marqu|contact)\s+(un|una|alguien))/i,
  /\b(n[uú]mero\s+(de\s+)?(tel[eé]fono|contacto)\s+(de\s+)?(la\s+|el\s+)?(sucursal|tienda|ejecutiv|encargad|jef|due|gerent|supervis))/i,
  /\b(p[aá]same|p[aá]se|transfi[ée]rame|tr[aá]nsfi[ée]reme)\s+con/i,
  /\b(quiero\s+(un|una)\s+(humano|persona|ejecutiv|encargad|asesor))/i,
];

function detectarPeticionHumano(text: string): DetectionResult {
  for (const pattern of HUMANO_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      return {
        detected: true,
        razon: "humano",
        contexto: match[0],
        severity: "medium",
      };
    }
  }
  return { detected: false };
}

// ─── C. Alto valor (pedido grande) ───────────────────────────────────────────

const KG_PATTERN = /\b(\d{3,})\s*(kg|kilos?)\b/i;
const MONTO_PATTERN = /\$\s*(\d{1,3}(?:[,.]?\d{3})+)/g;

const UMBRAL_KG = 300;
const UMBRAL_MONTO = 30000;

function detectarAltoValor(text: string): DetectionResult {
  // Detectar kg
  const kgMatch = KG_PATTERN.exec(text);
  if (kgMatch) {
    const kg = parseInt(kgMatch[1], 10);
    if (kg >= UMBRAL_KG) {
      return {
        detected: true,
        razon: "alto_valor",
        contexto: `Pedido de ${kg} kg`,
        severity: "high",
      };
    }
  }

  // Detectar monto
  MONTO_PATTERN.lastIndex = 0;
  let mMatch: RegExpExecArray | null;
  while ((mMatch = MONTO_PATTERN.exec(text)) !== null) {
    const raw = mMatch[1].replace(/[,.]/g, "");
    const monto = parseInt(raw, 10);
    if (monto >= UMBRAL_MONTO) {
      return {
        detected: true,
        razon: "alto_valor",
        contexto: `Monto de $${monto.toLocaleString("es-MX")}`,
        severity: "high",
      };
    }
  }

  return { detected: false };
}

// ─── D. Retries del bot (hallucinations recurrentes) ─────────────────────────

const HALLUCINATION_KEY = (phone: string) => `v2:hallucination_count:${phone}`;
const HALLUCINATION_TTL = 60 * 60; // 1 hora
const HALLUCINATION_THRESHOLD = 4;

export async function incrementHallucinationCount(
  phone: string,
  redis: Redis
): Promise<number> {
  const key = HALLUCINATION_KEY(phone);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, HALLUCINATION_TTL);
  }
  return count;
}

export async function getHallucinationCount(
  phone: string,
  redis: Redis
): Promise<number> {
  const key = HALLUCINATION_KEY(phone);
  const val = await redis.get<number>(key);
  return typeof val === "number" ? val : 0;
}

/**
 * Resetea el contador de hallucinations del cliente. Se llama cuando:
 *  - El bot ejecutó un tool exitosamente (ej. registrar_tela_no_manejada)
 *    indicando que la mención de tela no-catálogo fue LEGÍTIMA, no hallucination
 *  - Admin libera al cliente manualmente
 */
export async function resetHallucinationCount(
  phone: string,
  redis: Redis
): Promise<void> {
  const key = HALLUCINATION_KEY(phone);
  await redis.del(key);
}

export async function detectarRetries(
  phone: string,
  redis: Redis
): Promise<DetectionResult> {
  const count = await getHallucinationCount(phone, redis);
  if (count >= HALLUCINATION_THRESHOLD) {
    return {
      detected: true,
      razon: "retries",
      contexto: `${count} hallucinations en la última hora`,
      severity: "medium",
    };
  }
  return { detected: false };
}

// ─── E. Frustración por repetición ───────────────────────────────────────────

const FRUSTRACION_KEY = (phone: string) => `v2:frustration:${phone}`;
const FRUSTRACION_TTL = 60 * 10; // 10 minutos
const FRUSTRACION_THRESHOLD = 3;

const SIMILARITY_LENGTH = 30; // primeros 30 chars del mensaje para comparar

interface FrustrationState {
  count: number;
  lastSignature: string;
}

export async function trackFrustrationSignal(
  phone: string,
  userText: string,
  redis: Redis
): Promise<DetectionResult> {
  if (!userText || userText.length < 5) return { detected: false };

  const signature = userText
    .toLowerCase()
    .replace(/[¿?¡!.,;:]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SIMILARITY_LENGTH);

  const key = FRUSTRACION_KEY(phone);
  const current = (await redis.get<FrustrationState>(key)) ?? {
    count: 0,
    lastSignature: "",
  };

  let nextState: FrustrationState;
  if (current.lastSignature && signature.startsWith(current.lastSignature.slice(0, 15))) {
    nextState = { count: current.count + 1, lastSignature: signature };
  } else {
    nextState = { count: 1, lastSignature: signature };
  }

  await redis.set(key, nextState, { ex: FRUSTRACION_TTL });

  if (nextState.count >= FRUSTRACION_THRESHOLD) {
    return {
      detected: true,
      razon: "frustracion",
      contexto: `Cliente repitió ${nextState.count} veces "${signature.slice(0, 40)}..."`,
      severity: "medium",
    };
  }

  return { detected: false };
}

// ─── F. Facturación compleja ─────────────────────────────────────────────────

const FACTURACION_PATTERNS: RegExp[] = [
  /\b(r[eé]gimen\s+(fiscal|incorporado|simplificado))\b/i,
  /\b(rfc\s+(inv[aá]lid|err[oó]ne|no\s+registr))/i,
  /\b(cfdi\s*[34]\.0|complemento\s+(de\s+)?pago)\b/i,
  /\b(nota\s+de\s+cr[eé]dito|crédito\s+fiscal)\b/i,
  /\b(factura\s+(especial|global|negativa))\b/i,
  /\b(devoluci[oó]n\s+(parcial|total)|cancelaci[oó]n\s+de\s+factura)\b/i,
];

function detectarFacturacionCompleja(text: string): DetectionResult {
  for (const pattern of FACTURACION_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      return {
        detected: true,
        razon: "facturacion",
        contexto: match[0],
        severity: "medium",
      };
    }
  }
  return { detected: false };
}

// ─── Detector maestro ────────────────────────────────────────────────────────

/**
 * Ejecuta TODOS los detectores y retorna el de mayor severidad detectado.
 * Si ninguno se dispara, retorna { detected: false }.
 */
export async function detectAllReasons(
  userText: string,
  phone: string,
  redis: Redis
): Promise<DetectionResult> {
  // Detectores síncronos primero (más rápidos)
  const syncDetectors = [
    detectarQueja(userText),
    detectarPeticionHumano(userText),
    detectarAltoValor(userText),
    detectarFacturacionCompleja(userText),
  ];

  // Detectores asíncronos
  const asyncResults = await Promise.all([
    detectarRetries(phone, redis),
    trackFrustrationSignal(phone, userText, redis),
  ]);

  const all = [...syncDetectors, ...asyncResults].filter((r) => r.detected);

  if (all.length === 0) return { detected: false };

  // Priorizar por severity: high > medium > low
  const severityOrder = { high: 3, medium: 2, low: 1 };
  all.sort(
    (a, b) =>
      (severityOrder[b.severity ?? "low"] ?? 0) -
      (severityOrder[a.severity ?? "low"] ?? 0)
  );

  return all[0];
}
