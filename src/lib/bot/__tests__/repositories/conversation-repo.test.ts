import { describe, it, expect, beforeEach } from "vitest";
import { createFakeRedis } from "../helpers/fake-redis";
import * as convo from "../../repositories/conversation-repo";
import { MEMORY } from "../../config/constants";
import type { MensajeHistorial } from "../../types/domain";

const phone = "5215551234567";

function msg(content: string, role: "user" | "assistant" = "user"): MensajeHistorial {
  return { role, content, timestamp: new Date().toISOString() };
}

describe("conversation-repo", () => {
  let env: ReturnType<typeof createFakeRedis>;

  beforeEach(() => {
    env = createFakeRedis();
  });

  it("getHistorial devuelve [] si no hay nada", async () => {
    expect(await convo.getHistorial(phone, env.redis)).toEqual([]);
  });

  it("appendMensaje guarda y se puede leer", async () => {
    await convo.appendMensaje(phone, msg("hola"), env.redis);
    const h = await convo.getHistorial(phone, env.redis);
    expect(h).toHaveLength(1);
    expect(h[0].content).toBe("hola");
  });

  it("appendMensajes en batch", async () => {
    await convo.appendMensajes(
      phone,
      [msg("uno"), msg("dos"), msg("tres", "assistant")],
      env.redis
    );
    const h = await convo.getHistorial(phone, env.redis);
    expect(h).toHaveLength(3);
    expect(h[2].role).toBe("assistant");
  });

  it("appendMensajes con array vacío no rompe", async () => {
    await convo.appendMensaje(phone, msg("antes"), env.redis);
    await convo.appendMensajes(phone, [], env.redis);
    const h = await convo.getHistorial(phone, env.redis);
    expect(h).toHaveLength(1);
  });

  it("compacta al límite cuando se excede MAX_HISTORY_LENGTH", async () => {
    const max = MEMORY.MAX_HISTORY_LENGTH;
    const todos: MensajeHistorial[] = [];
    for (let i = 0; i < max + 30; i++) {
      todos.push(msg(`m${i}`));
    }
    await convo.saveHistorial(phone, todos, env.redis);
    const h = await convo.getHistorial(phone, env.redis);
    expect(h).toHaveLength(max);
    // Debe haber conservado los últimos N
    expect(h[0].content).toBe(`m30`);
    expect(h[h.length - 1].content).toBe(`m${max + 29}`);
  });

  it("clearHistorial vacía la conversación", async () => {
    await convo.appendMensaje(phone, msg("hola"), env.redis);
    await convo.clearHistorial(phone, env.redis);
    const h = await convo.getHistorial(phone, env.redis);
    expect(h).toEqual([]);
  });

  // ── Resumen semántico ────────────────────────────────────────

  it("getResumen devuelve null si no se ha generado", async () => {
    expect(await convo.getResumen(phone, env.redis)).toBeNull();
  });

  it("setResumen / getResumen ida y vuelta", async () => {
    await convo.setResumen(
      phone,
      "Cliente interesado en Sportok, cotización pendiente",
      env.redis
    );
    expect(await convo.getResumen(phone, env.redis)).toBe(
      "Cliente interesado en Sportok, cotización pendiente"
    );
  });

  // ── Política de regeneración ─────────────────────────────────

  describe("debeRegenerarResumen", () => {
    it("no regenera con pocos mensajes", () => {
      expect(convo.debeRegenerarResumen(0)).toBe(false);
      expect(convo.debeRegenerarResumen(3)).toBe(false);
    });

    it("regenera en múltiplos del intervalo", () => {
      const n = MEMORY.SEMANTIC_SUMMARY_INTERVAL;
      expect(convo.debeRegenerarResumen(n * 2)).toBe(true); // 20
      expect(convo.debeRegenerarResumen(n * 3 + 1)).toBe(true); // 31
    });

    it("no regenera en mensajes intermedios", () => {
      expect(convo.debeRegenerarResumen(15)).toBe(false);
      expect(convo.debeRegenerarResumen(23)).toBe(false);
    });
  });
});
