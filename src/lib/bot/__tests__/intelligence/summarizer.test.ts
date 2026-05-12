import { describe, it, expect, beforeEach } from "vitest";
import { regenerateSummary } from "../../intelligence/summary/regenerator";
import {
  chatTextResponse,
  createFakeOpenAI,
} from "../helpers/fake-openai";
import type { MensajeHistorial } from "../../types/domain";

function mensaje(role: "user" | "assistant", content: string): MensajeHistorial {
  return { role, content, timestamp: new Date().toISOString() };
}

describe("summary/regenerator — regenerateSummary", () => {
  let env: ReturnType<typeof createFakeOpenAI>;

  beforeEach(() => {
    env = createFakeOpenAI();
  });

  it("regresa string vacío si el historial es muy corto", async () => {
    const r = await regenerateSummary(
      { historial: [mensaje("user", "hola")] },
      env.client
    );
    expect(r).toBe("");
    expect(env.chatCreate).not.toHaveBeenCalled();
  });

  it("genera resumen cuando hay suficiente historial", async () => {
    env.chatCreate.mockResolvedValueOnce(
      chatTextResponse(
        "PETICIÓN: Sportok 25kg para uniformes. COTIZACIÓN: $4800. ESTADO: pendiente método de pago. ALERTAS: ninguna."
      )
    );

    const r = await regenerateSummary(
      {
        historial: [
          mensaje("user", "necesito 25kg de Sportok"),
          mensaje("assistant", "Sportok 25kg sale en $4800"),
          mensaje("user", "ok, ¿cómo pago?"),
        ],
      },
      env.client
    );

    expect(r).toContain("Sportok");
    expect(r).toContain("$4800");
  });

  it("incluye resumen previo en el prompt si se proporciona", async () => {
    env.chatCreate.mockResolvedValueOnce(chatTextResponse("nuevo resumen"));

    await regenerateSummary(
      {
        historial: [
          mensaje("user", "uno"),
          mensaje("assistant", "dos"),
          mensaje("user", "tres"),
        ],
        resumenAnterior: "RESUMEN PREVIO: cliente pidió Alaska",
      },
      env.client
    );

    const userMsg = env.chatCreate.mock.calls[0][0].messages[1].content;
    expect(userMsg).toContain("RESUMEN PREVIO");
  });

  it("formatea el historial con etiquetas CLIENTE / BOT", async () => {
    env.chatCreate.mockResolvedValueOnce(chatTextResponse("ok"));

    await regenerateSummary(
      {
        historial: [
          mensaje("user", "necesito Sportok"),
          mensaje("assistant", "claro, ¿cuántos kilos?"),
          mensaje("user", "25 kilos"),
        ],
      },
      env.client
    );

    const userMsg = env.chatCreate.mock.calls[0][0].messages[1].content;
    expect(userMsg).toContain("CLIENTE: necesito Sportok");
    expect(userMsg).toContain("BOT: claro");
  });

  it("usa low temperature (0.2) para resumen consistente", async () => {
    env.chatCreate.mockResolvedValueOnce(chatTextResponse("ok"));

    await regenerateSummary(
      {
        historial: [
          mensaje("user", "uno"),
          mensaje("assistant", "dos"),
          mensaje("user", "tres"),
        ],
      },
      env.client
    );

    expect(env.chatCreate.mock.calls[0][0].temperature).toBe(0.2);
  });

  it("si falla la API, devuelve el resumen previo (no rompe contexto)", async () => {
    env.chatCreate.mockRejectedValueOnce(new Error("timeout"));

    const r = await regenerateSummary(
      {
        historial: [
          mensaje("user", "uno"),
          mensaje("assistant", "dos"),
          mensaje("user", "tres"),
        ],
        resumenAnterior: "el resumen anterior que sí teníamos",
      },
      env.client
    );

    expect(r).toBe("el resumen anterior que sí teníamos");
  });

  it("si falla la API y NO hay resumen previo, devuelve vacío", async () => {
    env.chatCreate.mockRejectedValueOnce(new Error("timeout"));

    const r = await regenerateSummary(
      {
        historial: [
          mensaje("user", "uno"),
          mensaje("assistant", "dos"),
          mensaje("user", "tres"),
        ],
      },
      env.client
    );

    expect(r).toBe("");
  });
});
