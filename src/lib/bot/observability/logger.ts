/**
 * Logger estructurado.
 *
 * Reglas:
 *  - Cero `console.log` en cÃ³digo de producciÃ³n. Todo pasa por aquÃ­.
 *  - Cada log lleva contexto: conversationId, phone, channel, step.
 *  - Los secretos (tokens, API keys) se redactan automÃ¡ticamente.
 *  - En desarrollo: salida pretty con colores. En producciÃ³n: JSON.
 *
 * Uso tÃ­pico:
 *
 *   const log = getLogger({ phone, channel, step: 'orchestrator' });
 *   log.info({ tactica }, 'Mensaje procesado');
 *   log.warn({ err }, 'Reintentando envÃ­o');
 *   log.error({ err, payload }, 'Stripe fallÃ³');
 */
import pino, { type Logger as PinoLogger, type LoggerOptions } from "pino";
import { getEnv } from "../config/env";

const env = getEnv();

const baseOptions: LoggerOptions = {
  level: env.LOG_LEVEL,
  base: {
    service: "coyote-bot",
    env: env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      // Variables de entorno y secrets
      "WHATSAPP_TOKEN",
      "OPENAI_API_KEY",
      "STRIPE_SECRET_KEY",
      "FACTURAPI_LIVE_SECRET_KEY",
      "UPSTASH_REDIS_REST_TOKEN",
      "SUPABASE_SERVICE_ROLE_KEY",
      // Patrones genÃ©ricos en payloads
      "*.password",
      "*.token",
      "*.secret",
      "*.apiKey",
      "*.api_key",
      "*.authorization",
      "headers.authorization",
      "headers.cookie",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },
};

// En desarrollo usamos pino-pretty si estÃ¡ disponible. En producciÃ³n JSON puro.
const transport =
  env.NODE_ENV === "development"
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss.l",
          ignore: "pid,hostname,service,env",
        },
      }
    : undefined;

const baseLogger: PinoLogger = pino({
  ...baseOptions,
  ...(transport ? { transport } : {}),
});

export type Logger = PinoLogger;

/**
 * Devuelve un logger con contexto.
 * El contexto se hereda en todos los logs subsecuentes hechos con ese logger.
 */
export function getLogger(context: Record<string, unknown> = {}): Logger {
  return baseLogger.child(context);
}

/**
 * Logger raÃ­z, sin contexto. Usar solo en el arranque del proceso o en
 * cÃ³digo que no tiene contexto de request.
 */
export const logger = baseLogger;
