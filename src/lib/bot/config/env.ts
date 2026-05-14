/**
 * Validador de variables de entorno.
 *
 * Se ejecuta una sola vez al arrancar. Si falta una variable crÃ­tica,
 * el proceso falla inmediatamente con un mensaje claro de quÃ© falta.
 *
 * Uso:
 *   import { getEnv } from '@/lib/bot/config/env';
 *   const env = getEnv();
 *   const apiKey = env.OPENAI_API_KEY;  // tipado, garantizado no vacÃ­o
 */
import { z } from "zod";

const booleanFromString = z
  .union([z.boolean(), z.string()])
  .transform((v) => {
    if (typeof v === "boolean") return v;
    return v.toLowerCase() === "true" || v === "1";
  });

const envSchema = z.object({
  // â”€â”€ Runtime â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  // â”€â”€ OpenAI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  OPENAI_API_KEY: z.string().min(20, "OPENAI_API_KEY parece vacÃ­a"),
  OPENAI_MODEL: z.string().default("gpt-4o"),
  OPENAI_MODEL_FALLBACK: z.string().default("gpt-4o-mini"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  OPENAI_VISION_MODEL: z.string().default("gpt-4o"),

  // â”€â”€ WhatsApp / Meta â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  WHATSAPP_TOKEN: z.string().min(20),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(5),
  WHATSAPP_VERIFY_TOKEN: z.string().min(8),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  META_GRAPH_API_VERSION: z.string().default("v22.0"),

  // â”€â”€ Stripe â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  STRIPE_SECRET_KEY: z.string().min(20),
  STRIPE_CHECKOUT_WEBHOOK_SECRET: z.string().min(10),
  STRIPE_API_VERSION: z.string().default("2024-11-20.acacia"),

  // â”€â”€ Facturapi (CFDI 4.0) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  FACTURAPI_LIVE_SECRET_KEY: z.string().min(20),

  // â”€â”€ Redis (Upstash) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(20),

  // â”€â”€ Postgres / Prisma â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  DATABASE_URL: z.string().url(),

  // â”€â”€ Supabase (pgvector + storage) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),

  // â”€â”€ Feature flags / MigraciÃ³n v1 â†’ v2 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Canales adicionales (opcionales) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  INSTAGRAM_TOKEN: z.string().optional(),
  INSTAGRAM_PAGE_ID: z.string().optional(),
  INSTAGRAM_APP_SECRET: z.string().optional(),
  INSTAGRAM_VERIFY_TOKEN: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),

  // â”€â”€ OperaciÃ³n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  AGENT_SILENCE_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000), // 15 min
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(8),
  DEDUPE_TTL_SECONDS: z.coerce.number().int().positive().default(300),

  // â”€â”€ Negocio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
 * Obtiene la configuraciÃ³n validada. Si falla la validaciÃ³n, lanza un error
 * con la lista exacta de variables invÃ¡lidas.
 *
 * Es seguro llamarla muchas veces: el resultado se cachea.
 */
export function getEnv(): Env {
  if (cached) return cached;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  â€¢ ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    const message = `âŒ Variables de entorno invÃ¡lidas:\n${issues}`;
    // En arranque queremos ver esto siempre, no respetar LOG_LEVEL:
    // eslint-disable-next-line no-console
    console.error(message);
    throw new Error("Environment validation failed");
  }

  cached = result.data;
  return cached;
}

/** Solo para tests. Limpia el cachÃ© para que el siguiente getEnv() revalide. */
export function _resetEnvCacheForTests() {
  cached = null;
}



