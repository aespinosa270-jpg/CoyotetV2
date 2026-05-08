/**
 * Cliente OpenAI — singleton.
 *
 * Una sola instancia por proceso. El SDK tiene retry automático con
 * exponential backoff y timeout global; configuramos ambos aquí.
 *
 * Para timeouts más finos por llamada, usar AbortController en chat().
 */
import OpenAI from "openai";
import { getEnv } from "../../config/env";
import { RESILIENCE } from "../../config/constants";

let cached: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (cached) return cached;
  const env = getEnv();
  cached = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    /** Timeout global del SDK. chat() puede sobreescribirlo per-call. */
    timeout: RESILIENCE.OPENAI_TIMEOUT_MS,
    /** Reintentos automáticos en 429 / 5xx con exponential backoff. */
    maxRetries: 2,
  });
  return cached;
}

/** Solo para tests: limpia el cliente cacheado para forzar recarga. */
export function _resetOpenAIClientForTests() {
  cached = null;
}
