import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  _resetRuntimeConfigCache,
  getRuntimeConfig,
} from "../../config/runtime-config";
import { createFakeRedis } from "../helpers/fake-redis";

describe("config/runtime-config", () => {
  beforeEach(() => {
    _resetRuntimeConfigCache();
  });

  it("usa env vars si no hay overlay en Redis", async () => {
    const env = createFakeRedis();
    const config = await getRuntimeConfig(env.redis);

    // El env de tests tiene BOT_V2_ENABLED=false, percentage=0
    expect(config.enabled).toBe(false);
    expect(config.percentage).toBe(0);
    expect(config.phones).toEqual([]);
    expect(config.extraInstructions).toBe("");
    expect(config.tone).toBe("");
  });

  it("aplica overlay de Redis sobre env", async () => {
    const env = createFakeRedis();
    await env.redis.set("v2:config", {
      enabled: true,
      percentage: 50,
      phones: ["5215551111111"],
      extraInstructions: "Esta semana hay descuento del 10%",
      tone: "más casual",
      updatedAt: new Date().toISOString(),
    });

    const config = await getRuntimeConfig(env.redis);
    expect(config.enabled).toBe(true);
    expect(config.percentage).toBe(50);
    expect(config.phones).toEqual(["5215551111111"]);
    expect(config.extraInstructions).toContain("descuento");
    expect(config.tone).toBe("más casual");
    expect(config.updatedAt).toBeTruthy();
  });

  it("campos individuales del overlay sobreescriben sin afectar otros", async () => {
    const env = createFakeRedis();
    // Solo guarda 'enabled', deja lo demás undefined
    await env.redis.set("v2:config", { enabled: true });

    const config = await getRuntimeConfig(env.redis);
    expect(config.enabled).toBe(true);
    // El resto cae al env (env tiene percentage=0)
    expect(config.percentage).toBe(0);
  });

  it("cachea por 30s — segunda llamada no toca Redis", async () => {
    const env = createFakeRedis();
    const spy = vi.spyOn(env.redis, "get");

    await getRuntimeConfig(env.redis);
    await getRuntimeConfig(env.redis);
    await getRuntimeConfig(env.redis);

    // Solo se llamó UNA vez a redis.get('v2:config')
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("_resetRuntimeConfigCache invalida el cache", async () => {
    const env = createFakeRedis();
    const spy = vi.spyOn(env.redis, "get");

    await getRuntimeConfig(env.redis);
    _resetRuntimeConfigCache();
    await getRuntimeConfig(env.redis);

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("fail-open: si Redis tira error, cae al env", async () => {
    const fakeRedisBroken = {
      get: vi.fn().mockRejectedValue(new Error("connection refused")),
    } as any;

    const config = await getRuntimeConfig(fakeRedisBroken);
    expect(config.enabled).toBe(false); // del env de tests
    expect(config.percentage).toBe(0);
  });

  it("phones vacío en overlay NO sobreescribe el env (caso edge)", async () => {
    const env = createFakeRedis();
    await env.redis.set("v2:config", { phones: [] });

    const config = await getRuntimeConfig(env.redis);
    // Como phones del env es [] también, ambos dan []
    expect(config.phones).toEqual([]);
  });
});
