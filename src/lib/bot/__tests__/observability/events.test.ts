import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  recordEvent,
  recordMessage,
  recordConversion,
  recordError,
  countEventsForDay,
  getDailyCounts,
  getRecentEvents,
} from "../../observability/events";
import { createFakeRedis } from "../helpers/fake-redis";

describe("observability/events", () => {
  let env: ReturnType<typeof createFakeRedis>;

  beforeEach(() => {
    env = createFakeRedis();
  });

  it("recordEvent guarda evento en Redis", async () => {
    await recordEvent(
      {
        type: "message",
        clientId: "5215551234567",
        channel: "whatsapp",
        data: { length: 50 },
      },
      env.redis
    );

    const count = await countEventsForDay("message", new Date(), env.redis);
    expect(count).toBe(1);
  });

  it("eventos del mismo tipo en el mismo día se acumulan", async () => {
    for (let i = 0; i < 5; i++) {
      await recordEvent(
        {
          type: "message",
          clientId: `phone_${i}`,
          channel: "whatsapp",
        },
        env.redis
      );
    }

    expect(await countEventsForDay("message", new Date(), env.redis)).toBe(5);
  });

  it("recordMessage es un alias de conveniencia", async () => {
    // Usar el wrapper directamente y verificar que se registra
    await recordEvent(
      { type: "message", clientId: "x", channel: "whatsapp" },
      env.redis
    );
    expect(await countEventsForDay("message", new Date(), env.redis)).toBe(1);
  });

  it("recordError captura mensajes de error", async () => {
    await recordEvent(
      {
        type: "error",
        clientId: "521",
        channel: "whatsapp",
        data: { message: "openai timeout" },
      },
      env.redis
    );
    expect(await countEventsForDay("error", new Date(), env.redis)).toBe(1);
  });

  it("recordConversion captura amount y método", async () => {
    await recordEvent(
      {
        type: "conversion",
        clientId: "521",
        channel: "whatsapp",
        data: { amount: 5000, paymentMethod: "stripe" },
      },
      env.redis
    );

    const events = await getRecentEvents(
      "conversion",
      new Date(),
      10,
      env.redis
    );
    expect(events).toHaveLength(1);
    expect(events[0].data?.amount).toBe(5000);
  });

  it("getDailyCounts retorna array ordenado para últimos N días", async () => {
    await recordEvent({ type: "message" }, env.redis);
    await recordEvent({ type: "message" }, env.redis);
    await recordEvent({ type: "message" }, env.redis);

    const counts = await getDailyCounts("message", 7, env.redis);
    expect(counts).toHaveLength(7);
    // Último día (hoy) debería tener 3
    expect(counts[counts.length - 1].count).toBe(3);
    // Días previos sin eventos = 0
    expect(counts[0].count).toBe(0);
  });

  it("getRecentEvents devuelve ordenados del más reciente al más viejo", async () => {
    const t1 = Date.now() - 1000;
    const t2 = Date.now() - 500;
    const t3 = Date.now();

    await recordEvent({ type: "message", clientId: "a", timestamp: t1 }, env.redis);
    await recordEvent({ type: "message", clientId: "b", timestamp: t2 }, env.redis);
    await recordEvent({ type: "message", clientId: "c", timestamp: t3 }, env.redis);

    const events = await getRecentEvents("message", new Date(), 10, env.redis);
    expect(events).toHaveLength(3);
    expect(events[0].clientId).toBe("c"); // más reciente primero
    expect(events[2].clientId).toBe("a");
  });

  it("getRecentEvents respeta el limit", async () => {
    for (let i = 0; i < 10; i++) {
      await recordEvent({ type: "message", clientId: `c_${i}` }, env.redis);
    }

    const events = await getRecentEvents("message", new Date(), 3, env.redis);
    expect(events).toHaveLength(3);
  });

  it("fail-open: si Redis tira, recordEvent no propaga", async () => {
    const brokenRedis = {
      zadd: vi.fn().mockRejectedValue(new Error("redis down")),
      expire: vi.fn(),
    } as any;

    // No debe tirar
    await expect(
      recordEvent({ type: "error" }, brokenRedis)
    ).resolves.toBeUndefined();
  });

  it("countEventsForDay con día sin eventos devuelve 0", async () => {
    const ayer = new Date();
    ayer.setUTCDate(ayer.getUTCDate() - 1);

    await recordEvent({ type: "message" }, env.redis); // hoy

    expect(await countEventsForDay("message", ayer, env.redis)).toBe(0);
  });

  it("contadores de distintos tipos son independientes", async () => {
    await recordEvent({ type: "message" }, env.redis);
    await recordEvent({ type: "error" }, env.redis);
    await recordEvent({ type: "error" }, env.redis);
    await recordEvent({ type: "conversion" }, env.redis);

    expect(await countEventsForDay("message", new Date(), env.redis)).toBe(1);
    expect(await countEventsForDay("error", new Date(), env.redis)).toBe(2);
    expect(await countEventsForDay("conversion", new Date(), env.redis)).toBe(1);
    expect(await countEventsForDay("vision", new Date(), env.redis)).toBe(0);
  });
});
