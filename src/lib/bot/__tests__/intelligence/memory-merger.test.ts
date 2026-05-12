import { describe, it, expect } from "vitest";
import { buildMemoryBlock, mergeHechos } from "../../intelligence/memory/merger";
import type {
  HechoEpisodico,
  MemoriaEpisodica,
} from "../../intelligence/memory/types";

function hecho(
  texto: string,
  overrides: Partial<HechoEpisodico> = {}
): HechoEpisodico {
  return {
    hecho: texto,
    categoria: "negocio",
    confianza: 0.7,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe("memory/merger — mergeHechos", () => {
  it("agrega un hecho nuevo si no había nada", () => {
    const r = mergeHechos([], [hecho("tiene fábrica en Iztapalapa")]);
    expect(r).toHaveLength(1);
    expect(r[0].hecho).toBe("tiene fábrica en Iztapalapa");
  });

  it("agrega varios hechos nuevos", () => {
    const r = mergeHechos(
      [],
      [
        hecho("fábrica en Iztapalapa"),
        hecho("compra cada 30 días"),
        hecho("prefiere colores oscuros"),
      ]
    );
    expect(r).toHaveLength(3);
  });

  it("dedupea hechos casi idénticos y sube confianza", () => {
    const existentes = [
      hecho("Tiene fábrica de uniformes escolares en Iztapalapa", {
        confianza: 0.5,
      }),
    ];
    const nuevos = [
      hecho("Tiene una fábrica de uniformes escolares en Iztapalapa", {
        confianza: 0.7,
      }),
    ];
    const r = mergeHechos(existentes, nuevos);
    expect(r).toHaveLength(1);
    expect(r[0].confianza).toBeGreaterThan(0.5);
  });

  it("hechos genuinamente distintos NO se deduplican", () => {
    const r = mergeHechos(
      [hecho("tiene fábrica en Iztapalapa")],
      [hecho("compra cada 30 días")]
    );
    expect(r).toHaveLength(2);
  });

  it("array vacío de nuevos no cambia el existente", () => {
    const existentes = [hecho("uno"), hecho("dos")];
    const r = mergeHechos(existentes, []);
    expect(r).toHaveLength(2);
  });

  it("cap a MAX_HECHOS si se excede con nuevos, descartando los de menor confianza", () => {
    const existentes: HechoEpisodico[] = Array.from(
      { length: 30 },
      (_, i) =>
        hecho(`hecho número ${i} con texto único distinto cada vez`, {
          confianza: i / 30,
        })
    );
    // Disparamos el cap pasando 1 hecho nuevo de alta confianza
    const r = mergeHechos(existentes, [
      hecho("hecho recién aprendido único", { confianza: 0.99 }),
    ]);
    expect(r.length).toBeLessThanOrEqual(25);
    // El nuevo de alta confianza debe estar
    expect(r.some((h) => h.hecho === "hecho recién aprendido único")).toBe(true);
    // Los que quedaron deben ser los de más alta confianza
    const confianzas = r.map((h) => h.confianza);
    expect(Math.min(...confianzas)).toBeGreaterThan(0.15);
  });

  it("no muta el array de existentes (función pura)", () => {
    const existentes = [hecho("uno")];
    const snapshot = JSON.stringify(existentes);
    mergeHechos(existentes, [hecho("dos")]);
    expect(JSON.stringify(existentes)).toBe(snapshot);
  });
});

describe("memory/merger — buildMemoryBlock", () => {
  it("devuelve string vacío si no hay hechos suficientemente confiables", () => {
    const memoria: MemoriaEpisodica = {
      hechos: [hecho("algo dudoso", { confianza: 0.3 })],
      ultimaActualizacion: new Date().toISOString(),
    };
    expect(buildMemoryBlock(memoria)).toBe("");
  });

  it("incluye solo hechos con confianza >= threshold", () => {
    const memoria: MemoriaEpisodica = {
      hechos: [
        hecho("confiable", { confianza: 0.9 }),
        hecho("dudoso", { confianza: 0.2 }),
      ],
      ultimaActualizacion: new Date().toISOString(),
    };
    const block = buildMemoryBlock(memoria);
    expect(block).toContain("confiable");
    expect(block).not.toContain("dudoso");
  });

  it("ordena hechos por confianza desc", () => {
    const memoria: MemoriaEpisodica = {
      hechos: [
        hecho("medio", { confianza: 0.6 }),
        hecho("alto", { confianza: 0.95 }),
        hecho("bajo", { confianza: 0.55 }),
      ],
      ultimaActualizacion: new Date().toISOString(),
    };
    const block = buildMemoryBlock(memoria);
    const lines = block.split("\n");
    const altoIdx = lines.findIndex((l) => l.includes("alto"));
    const medioIdx = lines.findIndex((l) => l.includes("medio"));
    expect(altoIdx).toBeLessThan(medioIdx);
  });

  it("formato del header indica claramente al modelo qué es esto", () => {
    const memoria: MemoriaEpisodica = {
      hechos: [hecho("tiene tienda en Tepito", { confianza: 0.9 })],
      ultimaActualizacion: new Date().toISOString(),
    };
    const block = buildMemoryBlock(memoria);
    expect(block).toContain("LO QUE SABES DEL CLIENTE");
    expect(block).toContain("[negocio]");
  });

  it("respeta maxHechos para no inflar el prompt", () => {
    const hechos = Array.from({ length: 50 }, (_, i) =>
      hecho(`hecho importante numero ${i}`, { confianza: 0.9 })
    );
    const memoria: MemoriaEpisodica = {
      hechos,
      ultimaActualizacion: new Date().toISOString(),
    };
    const block = buildMemoryBlock(memoria, { maxHechos: 5 });
    const lines = block.split("\n").filter((l) => l.startsWith("- "));
    expect(lines.length).toBe(5);
  });
});
