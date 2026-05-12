import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  analyzeIncomingImage,
  buildEnrichedMessage,
  parseVisionResponse,
} from "../../intelligence/vision/analyzer";
import * as visionService from "../../services/openai/vision";
import * as mediaService from "../../services/meta/media";
import * as cache from "../../intelligence/vision/cache";
import type { IncomingMessage } from "../../types/messages";
import type { VisionAnalysisResult } from "../../intelligence/vision/types";

vi.mock("../../services/openai/vision");
vi.mock("../../services/meta/media");
vi.mock("../../intelligence/vision/cache");

function makeImageMessage(
  overrides: Partial<IncomingMessage["media"]> = {}
): IncomingMessage {
  return {
    id: "msg-1",
    channel: "whatsapp",
    channelMessageId: "wamid.abc",
    from: { id: "521" },
    to: { id: "525627301525" },
    type: "image",
    media: {
      nativeId: "meta_media_999",
      mimeType: "image/jpeg",
      sha256: "abc123hash",
      caption: "",
      ...overrides,
    },
    receivedAt: new Date(),
    raw: {},
  };
}

describe("vision/analyzer — parseVisionResponse", () => {
  it("parsea JSON limpio", () => {
    const raw = JSON.stringify({
      esProducto: true,
      descripcion: "tela polar afelpada azul marino",
      tipoTela: "polar",
      colores: ["azul marino"],
      atributos: ["afelpada", "abrigadora"],
      usosProbables: ["sudaderas"],
      confianza: 0.85,
    });
    const r = parseVisionResponse(raw);
    expect(r.esProducto).toBe(true);
    expect(r.tipoTela).toBe("polar");
    expect(r.colores).toEqual(["azul marino"]);
    expect(r.confianza).toBe(0.85);
  });

  it("limpia ```json``` fences si GPT los pone", () => {
    const raw =
      '```json\n{"esProducto":true,"descripcion":"tela","colores":[],"atributos":[],"usosProbables":[],"confianza":0.7}\n```';
    const r = parseVisionResponse(raw);
    expect(r.esProducto).toBe(true);
    expect(r.descripcion).toBe("tela");
  });

  it("extrae JSON cuando GPT lo envuelve en texto", () => {
    const raw =
      'Aquí está el análisis: {"esProducto":true,"descripcion":"x","colores":[],"atributos":[],"usosProbables":[],"confianza":0.5}';
    const r = parseVisionResponse(raw);
    expect(r.esProducto).toBe(true);
  });

  it("respuesta vacía → fallback con esProducto=false", () => {
    const r = parseVisionResponse("");
    expect(r.esProducto).toBe(false);
    expect(r.confianza).toBe(0);
  });

  it("JSON inválido → fallback sin tirar", () => {
    const r = parseVisionResponse("{ no es json válido :( }");
    expect(r.esProducto).toBe(false);
  });

  it("clampa confianza fuera de rango", () => {
    const r = parseVisionResponse(
      JSON.stringify({
        esProducto: true,
        descripcion: "x",
        confianza: 5,
        colores: [],
        atributos: [],
        usosProbables: [],
      })
    );
    expect(r.confianza).toBe(1);
  });

  it("normaliza arrays faltantes a []", () => {
    const r = parseVisionResponse(
      JSON.stringify({ esProducto: true, descripcion: "x", confianza: 0.5 })
    );
    expect(r.colores).toEqual([]);
    expect(r.atributos).toEqual([]);
    expect(r.usosProbables).toEqual([]);
  });
});

describe("vision/analyzer — buildEnrichedMessage", () => {
  function producto(overrides: Partial<VisionAnalysisResult> = {}): VisionAnalysisResult {
    return {
      esProducto: true,
      descripcion: "tela polar afelpada azul marino abrigadora",
      tipoTela: "polar",
      colores: ["azul marino"],
      atributos: ["afelpada"],
      usosProbables: ["sudaderas"],
      confianza: 0.85,
      ...overrides,
    };
  }

  it("incluye descripción, tipo, colores y atributos", () => {
    const r = buildEnrichedMessage(producto(), "");
    expect(r).toContain("Descripción:");
    expect(r).toContain("polar");
    expect(r).toContain("azul marino");
    expect(r).toContain("afelpada");
  });

  it("incluye el caption del cliente cuando lo hay", () => {
    const r = buildEnrichedMessage(producto(), "Cuánto me sale?");
    expect(r).toContain("Cuánto me sale?");
  });

  it("instruye al bot a matchear con catálogo", () => {
    const r = buildEnrichedMessage(producto(), "");
    expect(r).toContain("identificar qué producto del catálogo");
  });

  it("si no es producto, pide al bot que pregunte cortésmente", () => {
    const r = buildEnrichedMessage(
      {
        esProducto: false,
        razonNoEsProducto: "credencial",
        descripcion: "",
        colores: [],
        atributos: [],
        usosProbables: [],
        confianza: 0,
      },
      ""
    );
    expect(r).toContain("no parece");
    expect(r).toContain("pregunta");
  });
});

describe("vision/analyzer — analyzeIncomingImage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(cache.getCachedAnalysis).mockResolvedValue(null);
    vi.mocked(cache.setCachedAnalysis).mockResolvedValue(undefined);
  });

  it("devuelve resultado del cache si existe", async () => {
    vi.mocked(cache.getCachedAnalysis).mockResolvedValueOnce({
      esProducto: true,
      descripcion: "cached tela",
      colores: ["rojo"],
      atributos: [],
      usosProbables: [],
      confianza: 0.9,
    });

    const r = await analyzeIncomingImage(makeImageMessage());

    expect(r.fromCache).toBe(true);
    expect(r.analysis.descripcion).toBe("cached tela");
    expect(mediaService.downloadMedia).not.toHaveBeenCalled();
    expect(visionService.analyzeImage).not.toHaveBeenCalled();
  });

  it("flujo completo: descarga + analiza + cachea", async () => {
    vi.mocked(mediaService.downloadMedia).mockResolvedValueOnce({
      base64: "BASE64_FAKE",
      mimeType: "image/jpeg",
      sizeBytes: 12345,
    });
    vi.mocked(visionService.analyzeImage).mockResolvedValueOnce(
      JSON.stringify({
        esProducto: true,
        descripcion: "tela jersey ligera",
        tipoTela: "jersey",
        colores: ["blanco"],
        atributos: [],
        usosProbables: ["playeras"],
        confianza: 0.8,
      })
    );

    const r = await analyzeIncomingImage(makeImageMessage());

    expect(r.fromCache).toBe(false);
    expect(r.analysis.tipoTela).toBe("jersey");
    expect(cache.setCachedAnalysis).toHaveBeenCalled();
  });

  it("NO cachea si el resultado dice que no es producto (no vale la pena)", async () => {
    vi.mocked(mediaService.downloadMedia).mockResolvedValueOnce({
      base64: "x",
      mimeType: "image/jpeg",
      sizeBytes: 100,
    });
    vi.mocked(visionService.analyzeImage).mockResolvedValueOnce(
      JSON.stringify({
        esProducto: false,
        razonNoEsProducto: "persona",
        descripcion: "",
        colores: [],
        atributos: [],
        usosProbables: [],
        confianza: 0.2,
      })
    );

    await analyzeIncomingImage(makeImageMessage());
    expect(cache.setCachedAnalysis).not.toHaveBeenCalled();
  });

  it("si downloadMedia falla, devuelve fallback sin tirar la app", async () => {
    vi.mocked(mediaService.downloadMedia).mockRejectedValueOnce(
      new Error("Meta 403")
    );

    const r = await analyzeIncomingImage(makeImageMessage());

    expect(r.analysis.esProducto).toBe(false);
    expect(r.enrichedUserMessage).toContain("no parece");
  });

  it("si vision falla, devuelve fallback sin tirar", async () => {
    vi.mocked(mediaService.downloadMedia).mockResolvedValueOnce({
      base64: "x",
      mimeType: "image/jpeg",
      sizeBytes: 100,
    });
    vi.mocked(visionService.analyzeImage).mockRejectedValueOnce(
      new Error("rate limit")
    );

    const r = await analyzeIncomingImage(makeImageMessage());

    expect(r.analysis.esProducto).toBe(false);
  });

  it("usa caption del cliente al construir el enriched message", async () => {
    vi.mocked(mediaService.downloadMedia).mockResolvedValueOnce({
      base64: "x",
      mimeType: "image/jpeg",
      sizeBytes: 100,
    });
    vi.mocked(visionService.analyzeImage).mockResolvedValueOnce(
      JSON.stringify({
        esProducto: true,
        descripcion: "tela",
        colores: [],
        atributos: [],
        usosProbables: [],
        confianza: 0.8,
      })
    );

    const r = await analyzeIncomingImage(
      makeImageMessage({ caption: "Cuánto me sale a 50 kilos?" })
    );

    expect(r.enrichedUserMessage).toContain("Cuánto me sale a 50 kilos?");
  });

  it("tira si el mensaje no es type=image", async () => {
    const wrong = { ...makeImageMessage(), type: "text" } as IncomingMessage;
    await expect(analyzeIncomingImage(wrong)).rejects.toThrow(
      "no es imagen"
    );
  });
});
