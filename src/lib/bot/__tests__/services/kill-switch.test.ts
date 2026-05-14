import { describe, it, expect, beforeEach } from "vitest";
import { vi } from "vitest";
import {
  shouldUseBotV2,
  shouldUseBotV2Async,
  killBotV2,
  reviveBotV2,
  getKillSwitchStatus,
} from "../../config/feature-flags";
import { createFakeRedis } from "../helpers/fake-redis";
import { _resetRuntimeConfigCache } from "../../config/runtime-config";

const fakeRedisEnv = createFakeRedis();

vi.mock("../../repositories/redis", () => ({
  getRedis: () => fakeRedisEnv.redis,
}));

describe("feature-flags V2 (Fase 12 — agresivo)", () => {
  beforeEach(async () => {
    _resetRuntimeConfigCache();
    await fakeRedisEnv.redis.del("v2:kill_switch");
  });

  it("shouldUseBotV2 (sync) retorna false en test env (BOT_V2_ENABLED=false)", () => {
    expect(shouldUseBotV2("5215551234567")).toBe(true);
    expect(shouldUseBotV2("web:uuid-abc")).toBe(true);
    expect(shouldUseBotV2("tg:12345")).toBe(true);
  });

  it("shouldUseBotV2Async retorna false por default (BOT_V2_ENABLED=false)", async () => {
    expect(await shouldUseBotV2Async("5215551234567")).toBe(true);
  });

  it("killBotV2 hace que shouldUseBotV2Async retorne false", async () => {
    await killBotV2();    expect(await shouldUseBotV2Async("5215551234567")).toBe(false);
  });

  it("reviveBotV2 vuelve a true", async () => {
    await killBotV2();
    await reviveBotV2();
    expect(await shouldUseBotV2Async("5215551234567")).toBe(true);
  });

  it("getKillSwitchStatus refleja el estado actual", async () => {
    expect((await getKillSwitchStatus()).v2Active).toBe(true);

    await killBotV2();
    expect((await getKillSwitchStatus()).killed).toBe(true);
    expect((await getKillSwitchStatus()).v2Active).toBe(false);

    await reviveBotV2();
    expect((await getKillSwitchStatus()).v2Active).toBe(true);
  });
});


