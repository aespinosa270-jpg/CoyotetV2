import { describe, it, expect, beforeEach } from "vitest";
import { createFakeRedis } from "../helpers/fake-redis";
import {
  clearMemoria,
  getMemoria,
  saveMemoria,
} from "../../repositories/memory-repo";
import type { HechoEpisodico } from "../../intelligence/memory/types";

function hecho(texto: string): HechoEpisodico {
  return {
    hecho: texto,
    categoria: "negocio",
    confianza: 0.8,
    timestamp: new Date().toISOString(),
  };
}

describe("repositories/memory-repo", () => {
  let env: ReturnType<typeof createFakeRedis>;
  const phone = "5215551234567";

  beforeEach(() => {
    env = createFakeRedis();
  });

  it("getMemoria devuelve memoria vacía si no existe", async () => {
    const m = await getMemoria(phone, env.redis);
    expect(m.hechos).toEqual([]);
    expect(m.ultimaActualizacion).toBeDefined();
  });

  it("saveMemoria + getMemoria roundtrip", async () => {
    await saveMemoria(
      phone,
      [hecho("tiene fábrica en Iztapalapa"), hecho("compra cada 30 días")],
      env.redis
    );
    const m = await getMemoria(phone, env.redis);
    expect(m.hechos).toHaveLength(2);
    expect(m.hechos[0].hecho).toBe("tiene fábrica en Iztapalapa");
  });

  it("saveMemoria respeta el cap MAX_HECHOS=25", async () => {
    const muchos = Array.from({ length: 50 }, (_, i) =>
      hecho(`hecho ${i}`)
    );
    const result = await saveMemoria(phone, muchos, env.redis);
    expect(result.hechos.length).toBeLessThanOrEqual(25);
  });

  it("saveMemoria actualiza el timestamp", async () => {
    const before = new Date(0).toISOString();
    await saveMemoria(phone, [hecho("uno")], env.redis);
    const m = await getMemoria(phone, env.redis);
    expect(m.ultimaActualizacion).not.toBe(before);
  });

  it("clearMemoria borra completo", async () => {
    await saveMemoria(phone, [hecho("uno")], env.redis);
    const ok = await clearMemoria(phone, env.redis);
    expect(ok).toBe(true);

    const m = await getMemoria(phone, env.redis);
    expect(m.hechos).toEqual([]);
  });

  it("clearMemoria sobre cliente sin memoria devuelve false", async () => {
    const ok = await clearMemoria(phone, env.redis);
    expect(ok).toBe(false);
  });

  it("memoria de un cliente no afecta a otro", async () => {
    await saveMemoria("521", [hecho("uno")], env.redis);
    await saveMemoria("522", [hecho("dos")], env.redis);
    const m1 = await getMemoria("521", env.redis);
    const m2 = await getMemoria("522", env.redis);
    expect(m1.hechos[0].hecho).toBe("uno");
    expect(m2.hechos[0].hecho).toBe("dos");
  });
});
