/**
 * Validador de variables de entorno.
 *
 * Se ejecuta una sola vez al arrancar. Si falta una variable crítica,
 * el proceso falla inmediatamente con un mensaje claro de qué falta.
 *
 * Uso:
 *   import { getEnv } from '@/lib/bot/config/env';
 *   const env = getEnv();
 *   const apiKey = env.OPENAI_API_KEY;  // tipado, garantizado no vacío
 */
import { z } from "zod";

const booleanFromString = z
  .union([z.boolean(), z.string()])
  .transform((v) => {
    if (typeof v === "boolean") return v;
    return v.toLowerCase() === "true" || v === "1";
  });

const envSchema = z.object({
  // ── Runtime ─────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  // ── OpenAI ──────────────────────────────────────────────────────
  OPENAI_API_KEY: z.string().min(20, "OPENAI_API_KEY parece vacía"),
  OPENAI_MODEL: z.string().default("gpt-4o"),
  OPENAI_MODEL_FALLBACK: z.string().default("gpt-4o-mini"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  OPENAI_VISION_MODEL: z.string().default("gpt-4o"),

  // ── WhatsApp / Meta ────────────────────────────────────────────
  WHATSAPP_TOKEN: z.string().min(20),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(5),
  WHATSAPP_VERIFY_TOKEN: z.string().min(8),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  META_GRAPH_API_VERSION: z.string().default("v22.0"),

  // ── Stripe ─────────────────────────────────────────────────────
  STRIPE_SECRET_KEY: z.string().min(20),
  STRIPE_WEBHOOK_SECRET: z.string().min(10),
  STRIPE_API_VERSION: z.string().default("2024-11-20.acacia"),

  // ── Facturapi (CFDI 4.0) ───────────────────────────────────────
  FACTURAPI_KEY: z.string().min(20),

  // ── Redis (Upstash) ────────────────────────────────────────────
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(20),

  // ── Postgres / Prisma ──────────────────────────────────────────
  DATABASE_URL: z.string().url(),

  // ── Supabase (pgvector + storage) ──────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),

  // ── Feature flags / Migración v1 → v2 ──────────────────────────
  BOT_V2_ENABLED: booleanFromString.default(false),
  BOT_V2_PHONES: z
    .string()
    .default("")
    .transform((s) =>
      s
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
    ),
  BOT_V2_PERCENTAGE: z.coerce.number().min(0).max(100).default(0),

  // ── Canales adicionales (opcionales) ───────────────────────────
  INSTAGRAM_TOKEN: z.string().optional(),
  INSTAGRAM_PAGE_ID: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),

  // ── Operación ──────────────────────────────────────────────────
  AGENT_SILENCE_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000), // 15 min
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(8),
  DEDUPE_TTL_SECONDS: z.coerce.number().int().positive().default(300),

  // ── Negocio ────────────────────────────────────────────────────
  BUSINESS_PHONE_E164: z.string().default("5215627301525"),
  BUSINESS_NAME: z.string().default("Coyote Textil"),
  TERMS_URL: z.string().url().default("https://www.coyotetextil.com/terms"),
  PRIVACY_URL: z
    .string()
    .url()
    .default("https://www.coyotetextil.com/privacy"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * Obtiene la configuración validada. Si falla la validación, lanza un error
 * con la lista exacta de variables inválidas.
 *
 * Es seguro llamarla muchas veces: el resultado se cachea.
 */
export function getEnv(): Env {
  if (cached) return cached;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    const message = `❌ Variables de entorno inválidas:\n${issues}`;
    // En arranque queremos ver esto siempre, no respetar LOG_LEVEL:
    // eslint-disable-next-line no-console
    console.error(message);
    throw new Error("Environment validation failed");
  }

  cached = result.data;
  return cached;
}

/** Solo para tests. Limpia el caché para que el siguiente getEnv() revalide. */
export function _resetEnvCacheForTests() {
  cached = null;
}