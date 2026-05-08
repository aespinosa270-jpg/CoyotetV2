/**
 * Fake del cliente OpenAI para tests.
 *
 * No es un mock genérico: implementa la shape mínima que `chat.ts`,
 * `embeddings.ts` y `vision.ts` consumen, y permite:
 *  - Pre-cargar respuestas que se devuelven en orden.
 *  - Inspeccionar las llamadas hechas (qué params se pasaron).
 *  - Simular errores y timeouts.
 */
import type OpenAI from "openai";
import { vi } from "vitest";

export interface FakeOpenAIBundle {
  /** Cast a OpenAI; se inyecta a chat()/embeddings()/vision(). */
  client: OpenAI;
  /** Mock de chat.completions.create — para inspeccionar y configurar. */
  chatCreate: ReturnType<typeof vi.fn>;
  /** Mock de embeddings.create. */
  embeddingsCreate: ReturnType<typeof vi.fn>;
}

/** Respuesta de chat con texto simple. */
export function chatTextResponse(text: string, finishReason = "stop") {
  return {
    id: "chatcmpl-test",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "gpt-4o",
    choices: [
      {
        index: 0,
        finish_reason: finishReason,
        message: { role: "assistant", content: text },
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  };
}

/** Respuesta de chat con tool calls. */
export function chatToolCallResponse(
  calls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>
) {
  return {
    id: "chatcmpl-test-tool",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "gpt-4o",
    choices: [
      {
        index: 0,
        finish_reason: "tool_calls",
        message: {
          role: "assistant",
          content: null,
          tool_calls: calls.map((c) => ({
            id: c.id,
            type: "function",
            function: { name: c.name, arguments: JSON.stringify(c.arguments) },
          })),
        },
      },
    ],
    usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
  };
}

/** Respuesta de embeddings con vectores predefinidos. */
export function embeddingResponse(vectors: number[][]) {
  return {
    object: "list",
    model: "text-embedding-3-small",
    data: vectors.map((v, i) => ({
      object: "embedding",
      index: i,
      embedding: v,
    })),
    usage: { prompt_tokens: 10, total_tokens: 10 },
  };
}

/**
 * Construye un cliente OpenAI fake.
 */
export function createFakeOpenAI(): FakeOpenAIBundle {
  const chatCreate = vi.fn();
  const embeddingsCreate = vi.fn();

  const client = {
    chat: { completions: { create: chatCreate } },
    embeddings: { create: embeddingsCreate },
  } as unknown as OpenAI;

  return { client, chatCreate, embeddingsCreate };
}
