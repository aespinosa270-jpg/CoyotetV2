import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchProducts, shouldUseRag } from "../../intelligence/rag/searcher";
import * as catalogRepo from "../../repositories/catalog-repo";
import * as vectorRepo from "../../repositories/vector-repo";
import * as embeddings from "../../services/openai/embeddings";

vi.mock("../../repositories/catalog-repo");
vi.mock("../../repositories/vector-repo");
vi.mock("../../services/openai/embeddings");

describe("intelligence/rag/searcher — shouldUseRag", () => {
  it("activa RAG cuando hay intención de producto", () => {
    expect(shouldUseRag("necesito tela para uniformes")).toBe(true);
    expect(shouldUseRag("50 kilos de Sportok")).toBe(true);
    expect(shouldUseRag("¿precio de Alaska?")).toBe(true);
    expect(shouldUseRag("busco algo peludo para frío")).toBe(true);
    expect(shouldUseRag("para hacer pants")).toBe(true);
  });

  it("NO activa RAG en saludos o small talk", () => {
    expect(shouldUseRag("hola")).toBe(false);
    expect(shouldUseRag("buen día")).toBe(false);
    expect(shouldUseRag("gracias")).toBe(false);
    expect(shouldUseRag("ok")).toBe(false);
  });

  it("NO activa RAG con mensaje muy corto", () => {
    expect(shouldUseRag("")).toBe(false);
    expect(shouldUseRag("hi")).toBe(false);
  });
});

describe("intelligence/rag/searcher — searchProducts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("devuelve [] si la query es vacía sin llamar a OpenAI", async () => {
    const r = await searchProducts("");
    expect(r).toEqual([]);
    expect(embeddings.getEmbedding).not.toHaveBeenCalled();
    expect(vectorRepo.searchHybrid).not.toHaveBeenCalled();
  });

  it("combina vector results con catálogo completo (overlays aplicados)", async () => {
    vi.mocked(embeddings.getEmbedding).mockResolvedValueOnce([0.1, 0.2]);
    vi.mocked(vectorRepo.searchHybrid).mockResolvedValueOnce([
      {
        productId: "prod_alaska",
        content: "Alaska tela polar",
        similarity: 0.85,
        matchType: "vector",
      },
      {
        productId: "prod_sportok",
        content: "Sportok",
        similarity: 0.78,
        matchType: "vector",
      },
    ]);
    vi.mocked(catalogRepo.getCatalog).mockResolvedValueOnce([
      {
        id: "prod_alaska",
        nombre: "Alaska",
        slug: "alaska",
        info: "tela polar",
        menudeo: 220,
        mayoreo: 200,
        categoria: "telas",
      } as any,
      {
        id: "prod_sportok",
        nombre: "Sportok",
        slug: "sportok",
        info: "tela deportiva",
        menudeo: 280,
        mayoreo: 250,
        categoria: "telas",
      } as any,
    ]);

    const r = await searchProducts("tela polar para frío");

    expect(r).toHaveLength(2);
    expect(r[0].producto.nombre).toBe("Alaska");
    expect(r[0].similarity).toBe(0.85);
    expect(r[1].producto.nombre).toBe("Sportok");
  });

  it("filtra productos hidden (no aparecen en el catálogo con overlay)", async () => {
    vi.mocked(embeddings.getEmbedding).mockResolvedValueOnce([0.1]);
    vi.mocked(vectorRepo.searchHybrid).mockResolvedValueOnce([
      {
        productId: "prod_alaska",
        content: "Alaska",
        similarity: 0.85,
        matchType: "vector",
      },
      {
        productId: "prod_ocultada",
        content: "tela oculta por Jack",
        similarity: 0.83,
        matchType: "vector",
      },
    ]);
    // catalog-repo aplica overlay y NO incluye `prod_ocultada` (está hidden)
    vi.mocked(catalogRepo.getCatalog).mockResolvedValueOnce([
      {
        id: "prod_alaska",
        nombre: "Alaska",
        slug: "alaska",
        info: "",
        menudeo: 220,
        mayoreo: 200,
        categoria: "telas",
      } as any,
    ]);

    const r = await searchProducts("tela");
    expect(r).toHaveLength(1);
    expect(r[0].producto.id).toBe("prod_alaska");
  });

  it("respeta el parámetro k", async () => {
    vi.mocked(embeddings.getEmbedding).mockResolvedValueOnce([0.1]);
    vi.mocked(vectorRepo.searchHybrid).mockResolvedValueOnce([]);
    vi.mocked(catalogRepo.getCatalog).mockResolvedValueOnce([]);

    await searchProducts("query", { k: 10 });

    expect(vectorRepo.searchHybrid).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ matchCount: 10 })
    );
  });

  it("fail-open: si pgvector falla, devuelve [] sin tirar el flujo", async () => {
    vi.mocked(embeddings.getEmbedding).mockResolvedValueOnce([0.1]);
    vi.mocked(vectorRepo.searchHybrid).mockRejectedValueOnce(
      new Error("supabase 500")
    );

    const r = await searchProducts("algo");
    expect(r).toEqual([]);
  });

  it("fail-open: si OpenAI embeddings falla, devuelve []", async () => {
    vi.mocked(embeddings.getEmbedding).mockRejectedValueOnce(
      new Error("rate limit")
    );

    const r = await searchProducts("algo");
    expect(r).toEqual([]);
  });

  it("preserva matchType 'exact' cuando viene del pgvector híbrido", async () => {
    vi.mocked(embeddings.getEmbedding).mockResolvedValueOnce([0.1]);
    vi.mocked(vectorRepo.searchHybrid).mockResolvedValueOnce([
      {
        productId: "prod_sportok",
        content: "Sportok",
        similarity: 1.5,
        matchType: "exact",
      },
    ]);
    vi.mocked(catalogRepo.getCatalog).mockResolvedValueOnce([
      {
        id: "prod_sportok",
        nombre: "Sportok",
        slug: "sportok",
        info: "",
        menudeo: 280,
        mayoreo: 250,
        categoria: "telas",
      } as any,
    ]);

    const r = await searchProducts("dame sportok");
    expect(r[0].matchType).toBe("exact");
  });
});
