import { describe, it, expect, vi } from "vitest";
import { executeTool } from "../../tools/executor";
import type { BotContext } from "../../core/types";
import type { ChatCompletionMessageToolCall } from "openai/resources/chat/completions";

// Mockeamos los handlers internos para probar solo el enrutamiento
vi.mock("../../tools/handlers/escalar", () => ({
  escalarAHumanoHandler: vi.fn().mockResolvedValue({ success: true, mock: "escalado" })
}));

describe("tools: executor", () => {
  const dummyContext = { state: {}, profile: {} } as unknown as BotContext;

  it("enruta correctamente a la herramienta existente", async () => {
    const call: ChatCompletionMessageToolCall = {
      id: "call_123",
      type: "function",
      function: { name: "escalar_a_humano", arguments: '{"motivo":"queja"}' }
    };
    const result = await executeTool(call, dummyContext);
    expect(result.mock).toBe("escalado");
  });

  it("devuelve error amigable si el JSON de GPT es inválido", async () => {
    const call: ChatCompletionMessageToolCall = {
      id: "call_123",
      type: "function",
      function: { name: "escalar_a_humano", arguments: '{"motivo": broken_json' }
    };
    const result = await executeTool(call, dummyContext);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("Excepción interna");
  });

  it("devuelve error si GPT alucina una herramienta que no existe", async () => {
    const call: ChatCompletionMessageToolCall = {
      id: "call_123",
      type: "function",
      function: { name: "herramienta_fantasma", arguments: '{}' }
    };
    const result = await executeTool(call, dummyContext);
    expect(result.error).toContain("no está implementada");
  });
});
