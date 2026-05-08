import { describe, it, expect } from "vitest";
import {
  chat,
  ChatTimeoutError,
  type ChatTool,
} from "../../services/openai/chat";
import {
  chatTextResponse,
  chatToolCallResponse,
  createFakeOpenAI,
} from "../helpers/fake-openai";

const sampleTool: ChatTool = {
  name: "calcular_envio",
  description: "Calcula el costo de envío para una cotización",
  parameters: {
    type: "object",
    properties: {
      cp: { type: "string" },
      kg: { type: "number" },
    },
    required: ["cp", "kg"],
  },
};

describe("openai/chat — respuesta de texto", () => {
  it("devuelve texto cuando GPT no usa tools", async () => {
    const env = createFakeOpenAI();
    env.chatCreate.mockResolvedValue(chatTextResponse("Hola, ¿en qué le ayudo?"));

    const result = await chat(
      [{ role: "user", content: "hola" }],
      {},
      env.client
    );

    expect(result.text).toBe("Hola, ¿en qué le ayudo?");
    expect(result.toolCalls).toEqual([]);
    expect(result.finishReason).toBe("stop");
    expect(result.usage?.totalTokens).toBe(15);
  });

  it("pasa el modelo configurado por env", async () => {
    const env = createFakeOpenAI();
    env.chatCreate.mockResolvedValue(chatTextResponse("ok"));

    await chat([{ role: "user", content: "hola" }], {}, env.client);

    const callArgs = env.chatCreate.mock.calls[0][0];
    expect(callArgs.model).toBe("gpt-4o"); // del env de tests
  });

  it("permite override del modelo per-call", async () => {
    const env = createFakeOpenAI();
    env.chatCreate.mockResolvedValue(chatTextResponse("ok"));

    await chat(
      [{ role: "user", content: "hola" }],
      { model: "gpt-4o-mini" },
      env.client
    );

    expect(env.chatCreate.mock.calls[0][0].model).toBe("gpt-4o-mini");
  });

  it("usa temperature 0.1 por default (determinístico para venta)", async () => {
    const env = createFakeOpenAI();
    env.chatCreate.mockResolvedValue(chatTextResponse("ok"));

    await chat([{ role: "user", content: "hola" }], {}, env.client);

    expect(env.chatCreate.mock.calls[0][0].temperature).toBe(0.1);
  });
});

describe("openai/chat — tool calling", () => {
  it("pasa tools en formato OpenAI cuando se proporcionan", async () => {
    const env = createFakeOpenAI();
    env.chatCreate.mockResolvedValue(chatTextResponse("ok"));

    await chat(
      [{ role: "user", content: "calcular envío a 06000 con 25kg" }],
      { tools: [sampleTool] },
      env.client
    );

    const passedTools = env.chatCreate.mock.calls[0][0].tools;
    expect(passedTools).toHaveLength(1);
    expect(passedTools[0]).toEqual({
      type: "function",
      function: {
        name: "calcular_envio",
        description: "Calcula el costo de envío para una cotización",
        parameters: sampleTool.parameters,
      },
    });
  });

  it("no pasa tools cuando no se proporcionan", async () => {
    const env = createFakeOpenAI();
    env.chatCreate.mockResolvedValue(chatTextResponse("ok"));

    await chat([{ role: "user", content: "hola" }], {}, env.client);

    expect(env.chatCreate.mock.calls[0][0].tools).toBeUndefined();
  });

  it("parsea tool calls con argumentos JSON válidos", async () => {
    const env = createFakeOpenAI();
    env.chatCreate.mockResolvedValue(
      chatToolCallResponse([
        {
          id: "call_abc",
          name: "calcular_envio",
          arguments: { cp: "06000", kg: 25 },
        },
      ])
    );

    const result = await chat(
      [{ role: "user", content: "envío a 06000" }],
      { tools: [sampleTool] },
      env.client
    );

    expect(result.text).toBe("");
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]).toEqual({
      id: "call_abc",
      name: "calcular_envio",
      arguments: { cp: "06000", kg: 25 },
    });
    expect(result.finishReason).toBe("tool_calls");
  });

  it("parsea múltiples tool calls en un solo turno", async () => {
    const env = createFakeOpenAI();
    env.chatCreate.mockResolvedValue(
      chatToolCallResponse([
        { id: "call_1", name: "calcular_envio", arguments: { cp: "06000", kg: 25 } },
        { id: "call_2", name: "actualizar_perfil", arguments: { nombre: "Juan" } },
      ])
    );

    const result = await chat(
      [{ role: "user", content: "envío y guarda mi nombre Juan" }],
      { tools: [sampleTool] },
      env.client
    );

    expect(result.toolCalls).toHaveLength(2);
    expect(result.toolCalls[0].name).toBe("calcular_envio");
    expect(result.toolCalls[1].name).toBe("actualizar_perfil");
  });

  it("toolChoice 'auto' se pasa tal cual", async () => {
    const env = createFakeOpenAI();
    env.chatCreate.mockResolvedValue(chatTextResponse("ok"));

    await chat(
      [{ role: "user", content: "hola" }],
      { tools: [sampleTool], toolChoice: "auto" },
      env.client
    );

    expect(env.chatCreate.mock.calls[0][0].tool_choice).toBe("auto");
  });

  it("toolChoice forzado a una función específica", async () => {
    const env = createFakeOpenAI();
    env.chatCreate.mockResolvedValue(chatTextResponse("ok"));

    await chat(
      [{ role: "user", content: "envío" }],
      { tools: [sampleTool], toolChoice: { name: "calcular_envio" } },
      env.client
    );

    expect(env.chatCreate.mock.calls[0][0].tool_choice).toEqual({
      type: "function",
      function: { name: "calcular_envio" },
    });
  });

  it("argumentos JSON inválidos se quedan como {} sin tirar el pipeline", async () => {
    const env = createFakeOpenAI();
    // Construimos manualmente una respuesta con JSON corrupto
    env.chatCreate.mockResolvedValue({
      choices: [
        {
          finish_reason: "tool_calls",
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_bad",
                type: "function",
                function: { name: "x", arguments: "{not valid json" },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });

    const result = await chat(
      [{ role: "user", content: "x" }],
      { tools: [sampleTool] },
      env.client
    );

    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].arguments).toEqual({});
  });
});

describe("openai/chat — historial con tool calls", () => {
  it("convierte mensaje role='tool' al formato esperado por OpenAI", async () => {
    const env = createFakeOpenAI();
    env.chatCreate.mockResolvedValue(chatTextResponse("Listo"));

    await chat(
      [
        { role: "user", content: "envío" },
        {
          role: "assistant",
          content: "",
          tool_calls: [
            {
              id: "call_1",
              name: "calcular_envio",
              arguments: { cp: "06000", kg: 25 },
            },
          ],
        },
        {
          role: "tool",
          tool_call_id: "call_1",
          name: "calcular_envio",
          content: '{"total":1234}',
        },
      ],
      {},
      env.client
    );

    const apiMessages = env.chatCreate.mock.calls[0][0].messages;
    expect(apiMessages).toHaveLength(3);
    expect(apiMessages[1]).toMatchObject({
      role: "assistant",
      tool_calls: [
        {
          id: "call_1",
          type: "function",
          function: {
            name: "calcular_envio",
            arguments: '{"cp":"06000","kg":25}',
          },
        },
      ],
    });
    expect(apiMessages[2]).toEqual({
      role: "tool",
      tool_call_id: "call_1",
      content: '{"total":1234}',
    });
  });
});

describe("openai/chat — timeout y errores", () => {
  it("lanza ChatTimeoutError si excede timeoutMs", async () => {
    const env = createFakeOpenAI();
    // Mockeamos un Promise que nunca resuelve, pero respeta el AbortSignal
    env.chatCreate.mockImplementation((_params, opts: any) => {
      return new Promise((_resolve, reject) => {
        if (opts?.signal) {
          opts.signal.addEventListener("abort", () => {
            const err = new Error("Aborted");
            (err as any).name = "AbortError";
            reject(err);
          });
        }
      });
    });

    await expect(
      chat(
        [{ role: "user", content: "hola" }],
        { timeoutMs: 50 },
        env.client
      )
    ).rejects.toBeInstanceOf(ChatTimeoutError);
  });

  it("propaga errores no-timeout (ej. 500 del API)", async () => {
    const env = createFakeOpenAI();
    env.chatCreate.mockRejectedValue(new Error("500 Internal Server Error"));

    await expect(
      chat([{ role: "user", content: "hola" }], {}, env.client)
    ).rejects.toThrow("500 Internal Server Error");
  });

  it("response sin choices no rompe (devuelve vacío)", async () => {
    const env = createFakeOpenAI();
    env.chatCreate.mockResolvedValue({ choices: [] });

    const result = await chat([{ role: "user", content: "hola" }], {}, env.client);
    expect(result.text).toBe("");
    expect(result.toolCalls).toEqual([]);
  });
});
