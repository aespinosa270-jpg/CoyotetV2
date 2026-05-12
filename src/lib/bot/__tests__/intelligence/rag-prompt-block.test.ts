import { describe, it, expect } from "vitest";
import { buildRagBlock } from "../../intelligence/rag/prompt-block";
import type { SearchResult } from "../../intelligence/rag/searcher";

function result(
  nombre: string,
  similarity: number,
  matchType: "vector" | "exact" = "vector"
): SearchResult {
  return {
    producto: {
      id: `prod_${nombre.toLowerCase()}`,
      nombre,
      slug: nombre.toLowerCase(),
      info: "info",
      menudeo: 220,
      mayoreo: 200,
      categoria: "telas",
    } as any,
    similarity,
    matchType,
  };
}

describe("intelligence/rag/prompt-block — buildRagBlock", () => {
  it("formato cuando no hay resultados redirige a redirect honesto", () => {
    const block = buildRagBlock([]);
    expect(block).toContain("la búsqueda semántica no encontró");
    expect(block).toContain("probablemente pide algo que NO manejamos");
    expect(block).toContain("Responde con honestidad");
  });

  it("incluye top resultados con tags de similitud %", () => {
    const block = buildRagBlock([
      result("Alaska", 0.85),
      result("Sportok", 0.72),
    ]);

    expect(block).toContain("Alaska");
    expect(block).toContain("Sportok");
    expect(block).toContain("[85%]");
    expect(block).toContain("[72%]");
  });

  it("marca match exacto con tag especial", () => {
    const block = buildRagBlock([result("Sportok", 1.5, "exact")]);
    expect(block).toContain("[MATCH EXACTO]");
  });

  it("incluye precios y categoría", () => {
    const block = buildRagBlock([result("Alaska", 0.85)]);
    expect(block).toContain("$220");
    expect(block).toContain("$200");
    expect(block).toContain("por kg");
    expect(block).toContain("telas");
  });

  it("instruye al modelo a usar SOLO los productos del bloque", () => {
    const block = buildRagBlock([result("Alaska", 0.85)]);
    expect(block).toContain("MÁS RELEVANTES");
    expect(block).toContain("NO mencionas productos que no estén aquí");
  });

  it("usa unidad correcta según categoría", () => {
    const hiloResult: SearchResult = {
      producto: {
        id: "h",
        nombre: "Hilo blanco",
        slug: "hilo-blanco",
        info: "",
        menudeo: 80,
        mayoreo: 70,
        categoria: "hilos",
      } as any,
      similarity: 0.9,
      matchType: "vector",
    };
    const block = buildRagBlock([hiloResult]);
    expect(block).toContain("por cono");

    const elasticoResult: SearchResult = {
      producto: {
        id: "e",
        nombre: "Elástico 5cm",
        slug: "elastico-5cm",
        info: "",
        menudeo: 12,
        mayoreo: 10,
        categoria: "elasticos",
      } as any,
      similarity: 0.9,
      matchType: "vector",
    };
    const block2 = buildRagBlock([elasticoResult]);
    expect(block2).toContain("por metro");
  });

  it("delimitadores claros para que GPT parsee bien el bloque", () => {
    const block = buildRagBlock([result("Alaska", 0.85)]);
    expect(block).toContain("=== PRODUCTOS RELEVANTES PARA ESTA CONSULTA ===");
    expect(block).toContain("=== FIN ===");
  });
});
