import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  shouldUseBotV2,
  shouldUseBotV2Async,
  killBotV2,
  reviveBotV2,
} from "../../config/feature-flags";

const store: Record<string, unknown> = {};
vi.mock("../../repositories/redis", () => ({
  getRedis: () => ({
    get: async (k: string) => store[k] ?? null,
    set: async (k: string, v: unknown) => { store[k] = v; },
    del: async (k: string) => { delete store[k]; },
    flushall: async () => { for (const k in store) delete store[k]; },
  }),
}));

describe("config/feature-flags (Fase 12 Agresiva)", () => {
  beforeEach(async () => {
    for (const k in store) delete store[k];
  });

  it("shouldUseBotV2 (sync) — Fase 12: siempre true", () => {
    expect(shouldUseBotV2("5215551234567")).toBe(true);
  });

  it("shouldUseBotV2Async — sin kill switch: true", async () => {
    expect(await shouldUseBotV2Async("5215551234567")).toBe(true);
  });

  it("Fase 12 — whitelist ignorada, todos van a v2", async () => {
    expect(await shouldUseBotV2Async("5215551111111")).toBe(true);
    expect(await shouldUseBotV2Async("5215559999999")).toBe(true);
  });

  it("Fase 12 — percentage ignorado, todos van a v2", async () => {
    expect(await shouldUseBotV2Async("5215551111111")).toBe(true);
    expect(await shouldUseBotV2Async("5215552222222")).toBe(true);
  });

  it("determinismo — mismo telefono = mismo resultado", async () => {
    const phone = "5215551234567";
    const r1 = await shouldUseBotV2Async(phone);
    const r2 = await shouldUseBotV2Async(phone);
    expect(r1).toBe(r2);
  });

  it("Kill Switch — apaga v2", async () => {
    expect(await shouldUseBotV2Async("521")).toBe(true);
    await killBotV2();
    expect(await shouldUseBotV2Async("521")).toBe(false);
    await reviveBotV2();
    expect(await shouldUseBotV2Async("521")).toBe(true);
  });
});
