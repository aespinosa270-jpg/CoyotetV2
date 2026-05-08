/**
 * Smoke test de la fase 0.
 * Si esto pasa, la base del bot v2 está sana.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { _resetEnvCacheForTests, getEnv } from "../config/env";
import { getLogger } from "../observability/logger";

describe("config/env", () => {
  beforeEach(() => {
    _resetEnvCacheForTests();
  });

  it("carga las variables de entorno con valores por defecto", () => {
    const env = getEnv();
    expect(env.NODE_ENV).toBe("test");
    expect(env.OPENAI_MODEL).toBe("gpt-4o");
    expect(env.RATE_LIMIT_PER_MINUTE).toBe(8);
    expect(env.AGENT_SILENCE_TIMEOUT_MS).toBe(15 * 60 * 1000);
  });

  it("normaliza BOT_V2_PHONES de string CSV a array", () => {
    process.env.BOT_V2_PHONES = "5215551234567, 5215557654321 ,";
    _resetEnvCacheForTests();
    const env = getEnv();
    expect(env.BOT_V2_PHONES).toEqual(["5215551234567", "5215557654321"]);
  });

  it("convierte BOT_V2_ENABLED de string a boolean", () => {
    process.env.BOT_V2_ENABLED = "true";
    _resetEnvCacheForTests();
    expect(getEnv().BOT_V2_ENABLED).toBe(true);

    process.env.BOT_V2_ENABLED = "false";
    _resetEnvCacheForTests();
    expect(getEnv().BOT_V2_ENABLED).toBe(false);

    process.env.BOT_V2_ENABLED = "1";
    _resetEnvCacheForTests();
    expect(getEnv().BOT_V2_ENABLED).toBe(true);
  });

  it("falla si OPENAI_API_KEY está ausente", () => {
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    _resetEnvCacheForTests();
    expect(() => getEnv()).toThrow("Environment validation failed");
    process.env.OPENAI_API_KEY = original;
    _resetEnvCacheForTests();
  });
});

describe("observability/logger", () => {
  it("crea un logger con contexto", () => {
    const log = getLogger({ phone: "5215551234567", channel: "whatsapp" });
    expect(typeof log.info).toBe("function");
    expect(typeof log.error).toBe("function");
    // No truena si lo usamos
    log.info({ step: "smoke" }, "Logger funcionando");
  });
});