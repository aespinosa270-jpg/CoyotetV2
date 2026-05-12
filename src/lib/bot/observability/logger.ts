import pino, { type Logger as PinoLogger, type LoggerOptions } from "pino";
import { getEnv } from "../config/env";

export type Logger = PinoLogger;

let cached: PinoLogger | null = null;

function buildLogger(): PinoLogger {
  const env = getEnv();

  const baseOptions: LoggerOptions = {
    level: env.LOG_LEVEL,
    base: { service: "coyote-bot", env: env.NODE_ENV },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        "WHATSAPP_TOKEN",
        "OPENAI_API_KEY",
        "STRIPE_SECRET_KEY",
        "FACTURAPI_KEY",
        "UPSTASH_REDIS_REST_TOKEN",
        "SUPABASE_SERVICE_ROLE_KEY",
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

  return pino({ ...baseOptions, ...(transport ? { transport } : {}) });
}

function getBaseLogger(): PinoLogger {
  if (!cached) cached = buildLogger();
  return cached;
}

export function getLogger(context: Record<string, unknown> = {}): Logger {
  return getBaseLogger().child(context);
}

export const logger: Logger = new Proxy({} as Logger, {
  get(_target, prop, receiver) {
    return Reflect.get(getBaseLogger(), prop, receiver);
  },
}) as Logger;

export function _resetLoggerForTests() {
  cached = null;
}
