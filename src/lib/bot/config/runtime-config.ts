/**
 * Runtime Config — overlay del config del bot desde Redis sobre env vars.
 *
 * Permite al dashboard cambiar enabled/percentage/phones/tone/instructions
 * sin redeploy. Cache 30s en memoria del proceso para no martillar Redis
 * en cada mensaje (el feature flag se evalúa por cada webhook).
 *
 * Precedencia (mayor a menor):
 *   1. Valor en Redis (v2:config) — lo que el admin guardó
 *   2. Valor de env var — el default que se desplegó
 *
 * Si Redis cae, fail-open al env. El bot sigue funcionando con la última
 * configuración del deploy.
 */
import type { Redis } from "@upstash/redis";
import { getRedis } from "../repositories/redis";
import { getEnv } from "./env";
import { getLogger } from "../observability/logger";

const log = getLogger({ module: "runtime-config" });

const CONFIG_KEY = "v2:config";
const CACHE_TTL_MS = 30_000; // 30 segundos

/**
 * Voz de marca estructurada — editable desde /crm/admin/voz-de-marca
 * Si está null/vacío, el bot usa los defaults del prompt builder.
 */
export interface BrandVoice {
  tone?: string;                   // "directo, cálido, no empalagoso"
  allowedPhrases?: string[];       // ["te confirmo", "claro que sí"]
  forbiddenPhrases?: string[];     // ["Espero que te encuentres bien"]
  emojis?: string[];               // ["🐺", "🔥", "✅"]
  signature?: string;              // "Jack de Coyote"
  structuralRules?: string;        // "Max 4-5 líneas WA. Termina con pregunta SÍ/NO."
  extraNotes?: string;             // Notas libres del admin
  updatedAt?: string;
  updatedBy?: string;
}

export interface BotConfigOverlay {
  enabled?: boolean;
  percentage?: number;
  phones?: string[];
  extraInstructions?: string;
  tone?: string;
  brandVoice?: BrandVoice;
  updatedAt?: string;
}

export interface RuntimeConfig {
  /** Si el bot v2 está habilitado globalmente */
  enabled: boolean;
  /** Porcentaje de tráfico al v2 (0-100) */
  percentage: number;
  /** Teléfonos whitelist que siempre usan v2 */
  phones: string[];
  /** Instrucciones extra para el system prompt (puede ser "") */
  extraInstructions: string;
  /** Tono especial del bot (puede ser "") */
  tone: string;
  /** Voz de marca estructurada (null si no se ha configurado) */
  brandVoice: BrandVoice | null;
  /** Cuándo se actualizó el overlay por última vez en Redis (null si nunca) */
  updatedAt: string | null;
}

// ── Cache simple en memoria ───────────────────────────────────────

interface CacheEntry {
  value: RuntimeConfig;
  expiresAt: number;
}

let cached: CacheEntry | null = null;

/** Para tests, limpia el cache. */
export function _resetRuntimeConfigCache() {
  cached = null;
}

// ── API principal ─────────────────────────────────────────────────

/**
 * Devuelve la configuración del runtime: env vars + overlay de Redis.
 * Cachea por 30s en memoria.
 */
export async function getRuntimeConfig(
  redis: Redis = getRedis()
): Promise<RuntimeConfig> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const env = getEnv();

  // Base desde env (lo que se desplegó)
  const base: RuntimeConfig = {
    enabled: env.BOT_V2_ENABLED,
    percentage: env.BOT_V2_PERCENTAGE,
    phones: env.BOT_V2_PHONES || [],
    extraInstructions: "",
    tone: "",
    brandVoice: null,
    updatedAt: null,
  };

  // Intentar overlay desde Redis
  let overlay: BotConfigOverlay | null = null;
  try {
    overlay = await redis.get<BotConfigOverlay>(CONFIG_KEY);
  } catch (err) {
    log.warn(
      { err },
      "No se pudo leer v2:config de Redis — usando solo env (fail-open)"
    );
  }

  const merged: RuntimeConfig = overlay
    ? {
        enabled:
          typeof overlay.enabled === "boolean" ? overlay.enabled : base.enabled,
        percentage:
          typeof overlay.percentage === "number"
            ? overlay.percentage
            : base.percentage,
        phones:
          Array.isArray(overlay.phones) && overlay.phones.length > 0
            ? overlay.phones
            : base.phones,
        extraInstructions: overlay.extraInstructions ?? "",
        tone: overlay.tone ?? "",
        brandVoice: overlay.brandVoice ?? null,
        updatedAt: overlay.updatedAt ?? null,
      }
    : base;

  cached = {
    value: merged,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return merged;
}

/**
 * Versión sync que solo lee el env (sin overlay).
 * Solo usar donde no se puede await (ej. código legacy). Si puedes,
 * prefiere getRuntimeConfig().
 */
export function getRuntimeConfigSyncFallback(): RuntimeConfig {
  const env = getEnv();
  return {
    enabled: env.BOT_V2_ENABLED,
    percentage: env.BOT_V2_PERCENTAGE,
    phones: env.BOT_V2_PHONES || [],
    extraInstructions: "",
    tone: "",
    brandVoice: null,
    updatedAt: null,
  };
}
