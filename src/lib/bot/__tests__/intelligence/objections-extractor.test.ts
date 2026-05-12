import { describe, it, expect, beforeEach } from "vitest";
import { extractObjecion } from "../../intelligence/objections/extractor";
import {
  chatToolCallResponse,
  createFakeOpenAI,
} from "../helpers/fake-openai";

describe("objections/extractor — extractObjecion", () => {
  let env: ReturnType<typeof createFakeOpenAI>;

  beforeEach(() => {
    env = createFakeOpenAI();
  });

  it("clasifica objeción de precio", async () => {
    env.chatCreate.mockResolvedValueOnce(
      chatToolCallResponse([
        {
          id: "call_1",
          name: "registrar_objecion",
          arguments: {
            tipo: "precio_alto",
            severidad: 4,
            contexto: "muy caro para mi presupuesto",
          },
        },
      ])
    );

    const r = await extractObjecion("Está muy caro para mi presupuesto", env.client);
    expect(r.tipo).toBe("precio_alto");
    expect(r.severidad).toBe(4);
    expect(r.contexto).toContain("caro");
  });

  it("usa toolChoice forzado (no deja a GPT decidir si llama tool)", async () => {
    env.chatCreate.mockResolvedValueOnce(
      chatToolCallResponse([
        {
          id: "call_1",
          name: "registrar_objecion",
          arguments: { tipo: "ninguna", severidad: 1, contexto: "" },
        },
      ])
    );

    await extractObjecion("hola buen día", env.client);
    const params = env.chatCreate.mock.calls[0][0];
    expect(params.tool_choice).toEqual({
      type: "function",
      function: { name: "registrar_objecion" },
    });
  });

  it("mensaje vacío devuelve 'ninguna' sin llamar a OpenAI", async () => {
    const r = await extractObjecion("", env.client);
    expect(r.tipo).toBe("ninguna");
    expect(env.chatCreate).not.toHaveBeenCalled();
  });

  it("mensaje solo whitespace devuelve 'ninguna' sin llamar a OpenAI", async () => {
    const r = await extractObjecion("   \n  ", env.client);
    expect(r.tipo).toBe("ninguna");
    expect(env.chatCreate).not.toHaveBeenCalled();
  });

  it("tipo inválido recibido del modelo cae a 'ninguna'", async () => {
    env.chatCreate.mockResolvedValueOnce(
      chatToolCallResponse([
        {
          id: "call_1",
          name: "registrar_objecion",
          arguments: {
            tipo: "categoria_que_no_existe",
            severidad: 3,
            contexto: "x",
          },
        },
      ])
    );

    const r = await extractObjecion("algo", env.client);
    expect(r.tipo).toBe("ninguna");
  });

  it("severidad fuera de rango se clampa a [1, 5]", async () => {
    env.chatCreate.mockResolvedValueOnce(
      chatToolCallResponse([
        {
          id: "call_1",
          name: "registrar_objecion",
          arguments: { tipo: "precio_alto", severidad: 10, contexto: "x" },
        },
      ])
    );

    const r = await extractObjecion("muy caro", env.client);
    expect(r.severidad).toBe(5);
  });

  it("contexto se trunca a 80 chars", async () => {
    const largo = "x".repeat(200);
    env.chatCreate.mockResolvedValueOnce(
      chatToolCallResponse([
        {
          id: "call_1",
          name: "registrar_objecion",
          arguments: { tipo: "precio_alto", severidad: 3, contexto: largo },
        },
      ])
    );

    const r = await extractObjecion("algo", env.client);
    expect(r.contexto.length).toBeLessThanOrEqual(80);
  });

  it("si GPT no devuelve tool call, default a 'ninguna' (fail-open)", async () => {
    env.chatCreate.mockResolvedValueOnce({
      id: "test",
      choices: [
        {
          finish_reason: "stop",
          message: { role: "assistant", content: "no quiso usar tool" },
        },
      ],
    });

    const r = await extractObjecion("texto raro", env.client);
    expect(r.tipo).toBe("ninguna");
  });

  it("si OpenAI tira error, default a 'ninguna' (fail-open)", async () => {
    env.chatCreate.mockRejectedValueOnce(new Error("rate limit"));
    const r = await extractObjecion("algo", env.client);
    expect(r.tipo).toBe("ninguna");
  });
});
