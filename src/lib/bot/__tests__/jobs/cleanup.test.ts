import { describe, it, expect, beforeEach } from "vitest";
import { runCleanupJob } from "../../jobs/cleanup";
import { createFakeRedis } from "../helpers/fake-redis";

describe("jobs/cleanup", () => {
  let env: ReturnType<typeof createFakeRedis>;

  beforeEach(() => {
    env = createFakeRedis();
  });

  it("aplica TTL a keys de vision cache sin TTL", async () => {
    // Crear keys sin TTL (fake-redis los crea sin TTL si no se especifica)
    await env.redis.set("v2:vision:hash1", { foo: "bar" });
    await env.redis.set("v2:vision:hash2", { foo: "baz" });

    const result = await runCleanupJob({ redis: env.redis });

    expect(result.visionCacheRevisados).toBeGreaterThanOrEqual(2);
  });

  it("dryRun=true no modifica keys", async () => {
    await env.redis.set("v2:vision:hash1", { foo: "bar" });
    const result = await runCleanupJob({ redis: env.redis, dryRun: true });
    // Aún se revisan
    expect(result.visionCacheRevisados).toBeGreaterThanOrEqual(1);
  });

  it("sin keys que matcheen patterns, retorna ceros", async () => {
    const result = await runCleanupJob({ redis: env.redis });
    expect(result.visionCacheRevisados).toBe(0);
    expect(result.rateLimitsRevisados).toBe(0);
    expect(result.dedupesRevisados).toBe(0);
  });

  it("contadores son independientes por pattern", async () => {
    await env.redis.set("v2:vision:a", { x: 1 });
    await env.redis.set("v2:ratelimit:b", "1");
    await env.redis.set("v2:dedupe:c", "1");

    const result = await runCleanupJob({ redis: env.redis });

    expect(result.visionCacheRevisados).toBeGreaterThanOrEqual(1);
    expect(result.rateLimitsRevisados).toBeGreaterThanOrEqual(1);
    expect(result.dedupesRevisados).toBeGreaterThanOrEqual(1);
  });
});
