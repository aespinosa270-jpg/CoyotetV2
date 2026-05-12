import { describe, it, expect, beforeEach } from "vitest";
import { extractHechosEpisodicos } from "../../intelligence/memory/extractor";
import {
  chatToolCallResponse,
  createFakeOpenAI,
} from "../helpers/fake-openai";

describe("memory/extractor — extractHechosEpisodicos", () => {
  let env: ReturnType<typeof createFakeOpenAI>;

  beforeEach(() => {
    env = createFakeOpenAI();
  });

  it("devuelve array vacío si no hay mensajes recientes", async () => {
    const r = await extractHechosEpisodicos(
      { mensajesRecientes: [] },
      env.client
    );
    expect(r).toEqual([]);
    expect(env.chatCreate).not.toHaveBeenCalled();
  });

  it("parsea hechos devueltos por GPT", async () => {
    env.chatCreate.mockResolvedValueOnce(
      chatToolCallResponse([
        {
          id: "call_1",
          name: "extraer_hechos",
          arguments: {
            hechos: [
              {
                hecho: "Tiene fábrica de uniformes escolares en Iztapalapa",
                categoria: "negocio",
                confianza: 0.9,
                evidencia: "soy de Iztapalapa, hago uniformes escolares",
              },
              {
                hecho: "Compra mensualmente, ~$50k",
                categoria: "presupuesto",
                confianza: 0.7,
              },
            ],
          },
        },
      ])
    );

    const r = await extractHechosEpisodicos(
      {
        mensajesRecientes: [
          "soy de Iztapalapa, hago uniformes escolares, compro como $50,000 al mes",
        ],
      },
      env.client
    );

    expect(r).toHaveLength(2);
    expect(r[0].categoria).toBe("negocio");
    expect(r[0].confianza).toBe(0.9);
    expect(r[1].categoria).toBe("presupuesto");
  });

  it("agrega hechos existentes al prompt para evitar duplicados", async () => {
    env.chatCreate.mockResolvedValueOnce(
      chatToolCallResponse([
        { id: "c", name: "extraer_hechos", arguments: { hechos: [] } },
      ])
    );

    await extractHechosEpisodicos(
      {
        mensajesRecientes: ["hola"],
        hechosExistentes: ["Tiene fábrica en Iztapalapa", "Compra $50k al mes"],
      },
      env.client
    );

    const userMsg = env.chatCreate.mock.calls[0][0].messages[1].content;
    expect(userMsg).toContain("Tiene fábrica en Iztapalapa");
    expect(userMsg).toContain("NO los repitas");
  });

  it("array vacío de hechos devueltos por GPT se respeta", async () => {
    env.chatCreate.mockResolvedValueOnce(
      chatToolCallResponse([
        { id: "c", name: "extraer_hechos", arguments: { hechos: [] } },
      ])
    );

    const r = await extractHechosEpisodicos(
      { mensajesRecientes: ["hola"] },
      env.client
    );
    expect(r).toEqual([]);
  });

  it("hecho con categoría inválida cae a 'negocio' default", async () => {
    env.chatCreate.mockResolvedValueOnce(
      chatToolCallResponse([
        {
          id: "c",
          name: "extraer_hechos",
          arguments: {
            hechos: [
              {
                hecho: "algo",
                categoria: "categoria_inventada",
                confianza: 0.8,
              },
            ],
          },
        },
      ])
    );

    const r = await extractHechosEpisodicos(
      { mensajesRecientes: ["x"] },
      env.client
    );
    expect(r[0].categoria).toBe("negocio");
  });

  it("confianza fuera de rango se clampa a [0, 1]", async () => {
    env.chatCreate.mockResolvedValueOnce(
      chatToolCallResponse([
        {
          id: "c",
          name: "extraer_hechos",
          arguments: {
            hechos: [
              { hecho: "x", categoria: "negocio", confianza: 5 },
              { hecho: "y", categoria: "negocio", confianza: -1 },
            ],
          },
        },
      ])
    );

    const r = await extractHechosEpisodicos(
      { mensajesRecientes: ["x"] },
      env.client
    );
    expect(r[0].confianza).toBe(1);
    expect(r[1].confianza).toBe(0);
  });

  it("filtra hechos con texto vacío", async () => {
    env.chatCreate.mockResolvedValueOnce(
      chatToolCallResponse([
        {
          id: "c",
          name: "extraer_hechos",
          arguments: {
            hechos: [
              { hecho: "", categoria: "negocio", confianza: 0.8 },
              { hecho: "válido", categoria: "negocio", confianza: 0.8 },
            ],
          },
        },
      ])
    );

    const r = await extractHechosEpisodicos(
      { mensajesRecientes: ["x"] },
      env.client
    );
    expect(r).toHaveLength(1);
    expect(r[0].hecho).toBe("válido");
  });

  it("si OpenAI tira error, devuelve [] (fail-open)", async () => {
    env.chatCreate.mockRejectedValueOnce(new Error("rate limit"));
    const r = await extractHechosEpisodicos(
      { mensajesRecientes: ["algo"] },
      env.client
    );
    expect(r).toEqual([]);
  });
});
