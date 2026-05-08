/**
 * Setup global de Vitest.
 *
 * Se ejecuta una vez antes de TODOS los tests.
 * Mockea variables de entorno mÃ­nimas para que `getEnv()` no truene.
 */
import { beforeEach, vi } from "vitest";

// Variables de entorno mÃ­nimas para que el validador (env.ts) pase
(process.env as any).NODE_ENV = "test";
(process.env as any).LOG_LEVEL = "fatal"; // silenciar logs durante tests

(process.env as any).OPENAI_API_KEY = "sk-test-fake-key-for-vitest-only-12345678";
(process.env as any).WHATSAPP_TOKEN = "test-whatsapp-token-fake-1234567890";
(process.env as any).WHATSAPP_PHONE_NUMBER_ID = "1234567890";
(process.env as any).WHATSAPP_VERIFY_TOKEN = "test-verify-token";

(process.env as any).STRIPE_SECRET_KEY = "sk_test_fake1234567890abcdefghij";
(process.env as any).STRIPE_CHECKOUT_WEBHOOK_SECRET = "whsec_test1234567890";

(process.env as any).FACTURAPI_LIVE_SECRET_KEY = "sk_test_facturapi_fake1234567890";

(process.env as any).UPSTASH_REDIS_REST_URL = "https://fake-redis.upstash.io";
(process.env as any).UPSTASH_REDIS_REST_TOKEN = "fake-upstash-token-1234567890abcdef";

(process.env as any).DATABASE_URL = "postgresql://user:pass@localhost:5432/test";

// Feature flags off por defecto en tests
(process.env as any).BOT_V2_ENABLED = "false";
(process.env as any).BOT_V2_PHONES = "";
(process.env as any).BOT_V2_PERCENTAGE = "0";

beforeEach(() => {
  vi.clearAllMocks();
});
