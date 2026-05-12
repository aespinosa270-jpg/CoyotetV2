import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  indexCatalog,
  indexSingleProduct,
  productToEmbedText,
} from "../../intelligence/rag/indexer";
import * as catalogRepo from "../../repositories/catalog-repo";
import * as vectorRepo from "../../repositories/vector-repo";
import * as embeddings from "../../services/openai/embeddings";

vi.mock("../../repositories/catalog-repo");
vi.mock("../../repositories/vector-repo");
vi.mock("../../services/openai/embeddings");

describe("intelligence/rag/indexer — productToEmbedText", () => {
  it("incluye nombre, categoría e info", () => {
    const text = productToEmbedText({
      id: "prod_alaska",
      nombre: "Alaska",
      slug: "alaska",
      info: "tela polar peluda para frío",
      menudeo: 220,
      mayoreo: 200,
      categoria: "telas",
      rendimientoMxKg: 2.5,
      kgPorRollo: 25,
      colores: [],
      colorUnico: false,
    } as any);

    expect(text).toContain("Alaska");
    expect(text).toContain("telas");
    expect(text).toContain("tela polar");
    expect(text).toContain("Rendimiento: 2.5");
    expect(text).toContain("rollo de 25 kg");
  });

  it("NO incluye precios (cambian, no aportan a similitud semántica)", () => {
    const text = productToEmbedText({
      id: "x",
      nombre: "test",
      slug: "test",
      info: "",
      menudeo: 9999,
      mayoreo: 8888,
      categoria: "hilos",
    } as any);

    expect(text).not.toContain("9999");
    expect(text).not.toContain("8888");
  });

  it("incluye categoriaLibre si existe", () => {
    const text = productToEmbedText({
      id: "x",
      nombre: "Alaska",
      slug: "alaska",
      info: "",
      menudeo: 220,
      mayoreo: 200,
      categoria: "telas",
      categoriaLibre: "invernal premium",
    } as any);
    expect(text).toContain("invernal premium");
  });
});

describe("intelligence/rag/indexer — indexCatalog", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("devuelve count=0 si el catálogo está vacío", async () => {
    vi.mocked(catalogRepo.getCatalog).mockResolvedValueOnce([]);

    const result = await indexCatalog();
    expect(result.count).toBe(0);
    expect(embeddings.getEmbeddingsBatch).not.toHaveBeenCalled();
  });

  it("genera embeddings en batch y los upserta", async () => {
    vi.mocked(catalogRepo.getCatalog).mockResolvedValueOnce([
      {
        id: "p1",
        nombre: "Alaska",
        slug: "alaska",
        info: "polar",
        menudeo: 220,
        mayoreo: 200,
        categoria: "telas",
      } as any,
      {
        id: "p2",
        nombre: "Sportok",
        slug: "sportok",
        info: "deportiva",
        menudeo: 280,
        mayoreo: 250,
        categoria: "telas",
      } as any,
    ]);
    vi.mocked(embeddings.getEmbeddingsBatch).mockResolvedValueOnce([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
    vi.mocked(vectorRepo.upsertEmbeddingsBatch).mockResolvedValueOnce(2);

    const result = await indexCatalog();

    expect(result.count).toBe(2);
    // Una SOLA llamada batch (no loop)
    expect(embeddings.getEmbeddingsBatch).toHaveBeenCalledTimes(1);
    expect(vectorRepo.upsertEmbeddingsBatch).toHaveBeenCalledTimes(1);
  });

  it("rompe si el batch de embeddings devuelve cantidad incorrecta", async () => {
    vi.mocked(catalogRepo.getCatalog).mockResolvedValueOnce([
      { id: "p1", nombre: "x", slug: "x", info: "", menudeo: 1, mayoreo: 1, categoria: "telas" } as any,
      { id: "p2", nombre: "y", slug: "y", info: "", menudeo: 1, mayoreo: 1, categoria: "telas" } as any,
    ]);
    // OpenAI devuelve solo 1 cuando esperábamos 2
    vi.mocked(embeddings.getEmbeddingsBatch).mockResolvedValueOnce([[0.1]]);

    await expect(indexCatalog()).rejects.toThrow("count mismatch");
  });

  it("incluye metadata útil con cada embedding", async () => {
    vi.mocked(catalogRepo.getCatalog).mockResolvedValueOnce([
      {
        id: "prod_alaska",
        nombre: "Alaska",
        slug: "alaska",
        info: "polar",
        menudeo: 220,
        mayoreo: 200,
        categoria: "telas",
        categoriaLibre: "invernal",
      } as any,
    ]);
    vi.mocked(embeddings.getEmbeddingsBatch).mockResolvedValueOnce([[0.1]]);
    vi.mocked(vectorRepo.upsertEmbeddingsBatch).mockResolvedValueOnce(1);

    await indexCatalog();

    const upsertedRow = vi.mocked(vectorRepo.upsertEmbeddingsBatch).mock.calls[0][0][0];
    expect(upsertedRow.metadata).toMatchObject({
      nombre: "Alaska",
      slug: "alaska",
      categoria: "telas",
      categoriaLibre: "invernal",
    });
  });

  it("reporta tokens estimados para tracking de costos", async () => {
    vi.mocked(catalogRepo.getCatalog).mockResolvedValueOnce([
      { id: "p1", nombre: "test", slug: "test", info: "x".repeat(400), menudeo: 1, mayoreo: 1, categoria: "telas" } as any,
    ]);
    vi.mocked(embeddings.getEmbeddingsBatch).mockResolvedValueOnce([[0.1]]);
    vi.mocked(vectorRepo.upsertEmbeddingsBatch).mockResolvedValueOnce(1);

    const result = await indexCatalog();
    expect(result.estimatedTokens).toBeGreaterThan(0);
  });
});

describe("intelligence/rag/indexer — indexSingleProduct", () => {
  it("indexa solo un producto sin tocar los demás", async () => {
    vi.mocked(embeddings.getEmbeddingsBatch).mockResolvedValueOnce([[0.9, 0.1]]);
    vi.mocked(vectorRepo.upsertEmbeddingsBatch).mockResolvedValueOnce(1);

    await indexSingleProduct({
      id: "prod_custom",
      nombre: "Tela custom de Jack",
      slug: "custom",
      info: "una tela que solo vendemos a un cliente",
      menudeo: 500,
      mayoreo: 450,
      categoria: "telas",
    } as any);

    expect(embeddings.getEmbeddingsBatch).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining("Tela custom")]),
      undefined
    );
    expect(vectorRepo.upsertEmbeddingsBatch).toHaveBeenCalledWith([
      expect.objectContaining({ productId: "prod_custom" }),
    ]);
  });
});
