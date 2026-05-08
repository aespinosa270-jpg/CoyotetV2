import { describe, it, expect } from "vitest";
import {
  getEmbedding,
  getEmbeddingsBatch,
} from "../../services/openai/embeddings";
import { analyzeImage } from "../../services/openai/vision";
import {
  _resetOpenAIClientForTests,
  getOpenAIClient,
} from "../../services/openai/client";
import {
  createFakeOpenAI,
  embeddingResponse,
  chatTextResponse,
} from "../helpers/fake-openai";

// ── client ────────────────────────────────────────────────────────

describe("openai/client", () => {
  it("getOpenAIClient devuelve el mismo singleton en llamadas sucesivas", () => {
    _resetOpenAIClientForTests();
    const a = getOpenAIClient();
    const b = getOpenAIClient();
    expect(a).toBe(b);
  });

  it("_resetOpenAIClientForTests fuerza recarga", () => {
    _resetOpenAIClientForTests();
    const a = getOpenAIClient();
    _resetOpenAIClientForTests();
    const b = getOpenAIClient();
    // No es la misma instancia después del reset
    expect(a).not.toBe(b);
  });
});

// ── embeddings ────────────────────────────────────────────────────

describe("openai/embeddings — getEmbedding", () => {
  it("devuelve el vector del primer item", async () => {
    const env = createFakeOpenAI();
    env.embeddingsCreate.mockResolvedValue(
      embeddingResponse([[0.1, 0.2, 0.3]])
    );

    const v = await getEmbedding("micropique blanco", env.client);
    expect(v).toEqual([0.1, 0.2, 0.3]);
  });

  it("rechaza texto vacío", async () => {
    const env = createFakeOpenAI();
    await expect(getEmbedding("", env.client)).rejects.toThrow(
      "Cannot embed empty text"
    );
    await expect(getEmbedding("   ", env.client)).rejects.toThrow(
      "Cannot embed empty text"
    );
  });

  it("trimea espacios antes de mandar", async () => {
    const env = createFakeOpenAI();
    env.embeddingsCreate.mockResolvedValue(
      embeddingResponse([[0.1, 0.2]])
    );
    await getEmbedding("  micropique  ", env.client);
    expect(env.embeddingsCreate.mock.calls[0][0].input).toBe("micropique");
  });
});

describe("openai/embeddings — getEmbeddingsBatch", () => {
  it("devuelve [] si no hay textos", async () => {
    const env = createFakeOpenAI();
    const r = await getEmbeddingsBatch([], env.client);
    expect(r).toEqual([]);
    expect(env.embeddingsCreate).not.toHaveBeenCalled();
  });

  it("respeta el orden de entrada aunque la API regrese revuelto", async () => {
    const env = createFakeOpenAI();
    // Simular respuesta con index revuelto
    env.embeddingsCreate.mockResolvedValue({
      data: [
        { object: "embedding", index: 1, embedding: [9, 9] },
        { object: "embedding", index: 0, embedding: [1, 1] },
        { object: "embedding", index: 2, embedding: [3, 3] },
      ],
      model: "test",
      usage: { prompt_tokens: 1, total_tokens: 1 },
    });

    const r = await getEmbeddingsBatch(["a", "b", "c"], env.client);
    expect(r).toEqual([[1, 1], [9, 9], [3, 3]]);
  });

  it("rechaza si algún texto del batch está vacío", async () => {
    const env = createFakeOpenAI();
    await expect(
      getEmbeddingsBatch(["válido", ""], env.client)
    ).rejects.toThrow("Cannot embed empty text in batch");
  });
});

// ── vision ────────────────────────────────────────────────────────

describe("openai/vision — analyzeImage", () => {
  it("envía imageUrl como image_url", async () => {
    const env = createFakeOpenAI();
    env.chatCreate.mockResolvedValue(
      chatTextResponse("Tela tipo polar, gramaje medio.")
    );

    const r = await analyzeImage(
      {
        imageUrl: "https://example.com/foto.jpg",
        prompt: "¿Qué tela es?",
      },
      env.client
    );

    expect(r).toBe("Tela tipo polar, gramaje medio.");
    const messages = env.chatCreate.mock.calls[0][0].messages;
    expect(messages[0].content[1]).toEqual({
      type: "image_url",
      image_url: { url: "https://example.com/foto.jpg" },
    });
  });

  it("convierte imageBase64 a data URL con mime correcto", async () => {
    const env = createFakeOpenAI();
    env.chatCreate.mockResolvedValue(chatTextResponse("ok"));

    await analyzeImage(
      {
        imageBase64: "AAAAAA==",
        imageMimeType: "image/png",
        prompt: "describe",
      },
      env.client
    );

    const content = env.chatCreate.mock.calls[0][0].messages[0].content;
    expect(content[1]).toEqual({
      type: "image_url",
      image_url: { url: "data:image/png;base64,AAAAAA==" },
    });
  });

  it("default mime type es image/jpeg", async () => {
    const env = createFakeOpenAI();
    env.chatCreate.mockResolvedValue(chatTextResponse("ok"));

    await analyzeImage(
      { imageBase64: "AAAAAA==", prompt: "describe" },
      env.client
    );

    const content = env.chatCreate.mock.calls[0][0].messages[0].content;
    expect(content[1].image_url.url).toContain("data:image/jpeg;base64,");
  });

  it("falla si no se pasa ni URL ni base64", async () => {
    const env = createFakeOpenAI();
    await expect(
      analyzeImage({ prompt: "describe" }, env.client)
    ).rejects.toThrow("requires either imageUrl or imageBase64");
  });

  it("usa el modelo de visión por default del env", async () => {
    const env = createFakeOpenAI();
    env.chatCreate.mockResolvedValue(chatTextResponse("ok"));

    await analyzeImage(
      { imageUrl: "https://x.com/a.jpg", prompt: "describe" },
      env.client
    );

    expect(env.chatCreate.mock.calls[0][0].model).toBe("gpt-4o");
  });
});
