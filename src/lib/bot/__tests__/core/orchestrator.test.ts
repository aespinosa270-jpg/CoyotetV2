import { describe, it, expect, vi, beforeEach } from "vitest";
import { processMessage } from "../../core/orchestrator";
import * as chatService from "../../services/openai/chat";
import * as clientRepo from "../../repositories/client-repo";
import * as conversationRepo from "../../repositories/conversation-repo";
import * as executor from "../../tools/executor";
import * as promptBuilder from "../../intelligence/prompts/builder";
import * as objExtractor from "../../intelligence/objections/extractor";
import * as memExtractor from "../../intelligence/memory/extractor";
import * as summary from "../../intelligence/summary/regenerator";
import * as memoryRepo from "../../repositories/memory-repo";
import type { IncomingMessage } from "../../types/messages";

vi.mock("../../services/openai/chat");
vi.mock("../../repositories/client-repo");
vi.mock("../../repositories/conversation-repo", () => ({
  getHistorial: vi.fn(),
  appendMensaje: vi.fn(),
  appendMensajes: vi.fn(),
  saveHistorial: vi.fn(),
  getResumen: vi.fn(),
  setResumen: vi.fn(),
  debeRegenerarResumen: vi.fn().mockReturnValue(false),
}));
vi.mock("../../tools/executor");
vi.mock("../../intelligence/prompts/builder", () => ({
  buildSystemPrompt: vi.fn().mockResolvedValue("MOCK SYSTEM PROMPT"),
}));
vi.mock("../../intelligence/objections/extractor");
vi.mock("../../intelligence/memory/extractor");
vi.mock("../../intelligence/summary/regenerator");
vi.mock("../../repositories/memory-repo");
vi.mock("../../observability/events");

function makeIncomingMessage(
  text: string,
  overrides: Partial<IncomingMessage> = {}
): IncomingMessage {
  return {
    id: "msg-test-" + Math.random().toString(36).slice(2, 8),
    channel: "whatsapp",
    channelMessageId: "wamid.test123",
    from: { id: "5215551234567", displayName: "Test Cliente" },
    to: { id: "525627301525", displayName: "Coyote Textil" },
    type: "text",
    text,
    receivedAt: new Date(),
    raw: {},
    ...overrides,
  };
}

describe("core: orchestrator (Fase 5 integrada)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(promptBuilder.buildSystemPrompt).mockResolvedValue("MOCK SYSTEM PROMPT");
    vi.mocked(clientRepo.findOrCreate).mockResolvedValue({
      telefono: "5215551234567",
      nombre: "Test",
      segmento: "nuevo",
      totalCompras: 0,
      nivelConfianza: 40,
      temperaturaCompra: 30,
      tacticaActual: "valor_rendimiento",
      vectorObjeciones: {},
    } as any);
    vi.mocked(clientRepo.update).mockImplementation(
      async (_phone, patch) => ({ telefono: "5215551234567", nombre: "Test", segmento: "nuevo", totalCompras: 0, ...patch } as any)
    );
    vi.mocked(clientRepo.save).mockResolvedValue(undefined);
    vi.mocked(conversationRepo.getHistorial).mockResolvedValue([]);
    vi.mocked(conversationRepo.appendMensaje).mockResolvedValue([]);
    vi.mocked(conversationRepo.debeRegenerarResumen).mockReturnValue(false);
    vi.mocked(conversationRepo.getResumen).mockResolvedValue(null);
    vi.mocked(conversationRepo.setResumen).mockResolvedValue(undefined);
    vi.mocked(objExtractor.extractObjecion).mockResolvedValue({
      tipo: "ninguna",
      severidad: 1,
      contexto: "",
    });
    vi.mocked(memExtractor.extractHechosEpisodicos).mockResolvedValue([]);
    vi.mocked(summary.regenerateSummary).mockResolvedValue("");
    vi.mocked(memoryRepo.getMemoria).mockResolvedValue({
      hechos: [],
      ultimaActualizacion: new Date(0).toISOString(),
    });
    vi.mocked(memoryRepo.saveMemoria).mockResolvedValue({
      hechos: [],
      ultimaActualizacion: new Date().toISOString(),
    });
  });

  it("procesa un mensaje simple y dispara extractObjecion en paralelo", async () => {
    vi.mocked(chatService.chat).mockResolvedValueOnce({
      text: "Hola, soy El Coyote",
      toolCalls: [],
      finishReason: "stop",
    } as any);

    const msg = makeIncomingMessage("Hola");
    const responses = await processMessage(msg);

    expect(responses[0].text).toBe("Hola, soy El Coyote");
    expect(objExtractor.extractObjecion).toHaveBeenCalledWith("Hola");
  });

  it("guarda la objeción detectada cuando tipo !== 'ninguna'", async () => {
    vi.mocked(chatService.chat).mockResolvedValueOnce({
      text: "Entiendo, ¿qué presupuesto maneja?",
      toolCalls: [],
      finishReason: "stop",
    } as any);
    vi.mocked(objExtractor.extractObjecion).mockResolvedValueOnce({
      tipo: "precio_alto",
      severidad: 4,
      contexto: "está muy caro",
    });

    const msg = makeIncomingMessage("está muy caro");
    await processMessage(msg);

    expect(clientRepo.save).toHaveBeenCalled();
    const savedProfile = vi.mocked(clientRepo.save).mock.calls[0][0];
    expect((savedProfile as any).vectorObjeciones.precio_alto).toBe(4);
  });

  it("aplica decay al vector si tono positivo y sin objeción", async () => {
    vi.mocked(chatService.chat).mockResolvedValueOnce({
      text: "Perfecto, gracias por su confianza",
      toolCalls: [],
      finishReason: "stop",
    } as any);
    vi.mocked(clientRepo.findOrCreate).mockResolvedValueOnce({
      telefono: "5215551234567",
      nombre: "Test",
      segmento: "nuevo",
      totalCompras: 0,
      nivelConfianza: 40,
      temperaturaCompra: 30,
      tacticaActual: "valor_rendimiento",
      vectorObjeciones: { precio_alto: 10 },
    } as any);

    const msg = makeIncomingMessage("perfecto, gracias");
    await processMessage(msg);

    expect(clientRepo.save).toHaveBeenCalled();
    const savedProfile = vi.mocked(clientRepo.save).mock.calls[0][0];
    expect((savedProfile as any).vectorObjeciones.precio_alto).toBeLessThan(10);
  });

  it("NO regenera resumen/memoria si debeRegenerarResumen=false", async () => {
    vi.mocked(chatService.chat).mockResolvedValueOnce({
      text: "ok",
      toolCalls: [],
      finishReason: "stop",
    } as any);
    vi.mocked(conversationRepo.debeRegenerarResumen).mockReturnValue(false);

    const msg = makeIncomingMessage("hola");
    await processMessage(msg);

    expect(summary.regenerateSummary).not.toHaveBeenCalled();
    expect(memExtractor.extractHechosEpisodicos).not.toHaveBeenCalled();
  });

  it("regenera resumen y memoria cuando debeRegenerarResumen=true", async () => {
    vi.mocked(chatService.chat).mockResolvedValueOnce({
      text: "ok",
      toolCalls: [],
      finishReason: "stop",
    } as any);
    vi.mocked(conversationRepo.debeRegenerarResumen).mockReturnValue(true);
    vi.mocked(summary.regenerateSummary).mockResolvedValueOnce("nuevo resumen");
    vi.mocked(memExtractor.extractHechosEpisodicos).mockResolvedValueOnce([
      {
        hecho: "tiene fábrica en Iztapalapa",
        categoria: "negocio",
        confianza: 0.9,
        timestamp: new Date().toISOString(),
      },
    ]);

    const msg = makeIncomingMessage("hola otra vez");
    await processMessage(msg);

    expect(summary.regenerateSummary).toHaveBeenCalled();
    expect(memExtractor.extractHechosEpisodicos).toHaveBeenCalled();
    expect(conversationRepo.setResumen).toHaveBeenCalledWith(
      "5215551234567",
      "nuevo resumen",
      expect.anything()
    );
    expect(memoryRepo.saveMemoria).toHaveBeenCalled();
  });

  it("admin (elcoyote56) NO entra al pipeline de inteligencia", async () => {
    vi.mocked(chatService.chat).mockResolvedValueOnce({
      text: "Hola Jack",
      toolCalls: [],
      finishReason: "stop",
    } as any);

    const msg = makeIncomingMessage("elcoyote56");
    await processMessage(msg);

    // No corre extractor de objeciones (admin bypass)
    expect(objExtractor.extractObjecion).not.toHaveBeenCalled();
    // Tampoco guarda perfil con objeciones
    expect(clientRepo.save).not.toHaveBeenCalled();
  });

  it("si extractObjecion falla, el bot responde normal igual", async () => {
    vi.mocked(chatService.chat).mockResolvedValueOnce({
      text: "respuesta del bot",
      toolCalls: [],
      finishReason: "stop",
    } as any);
    vi.mocked(objExtractor.extractObjecion).mockRejectedValueOnce(
      new Error("OpenAI rate limit")
    );

    const msg = makeIncomingMessage("hola");
    const responses = await processMessage(msg);

    // Cliente recibe respuesta limpia
    expect(responses[0].text).toBe("respuesta del bot");
  });

  it("autodetecta CP y dispara extractor de objeciones del mismo mensaje", async () => {
    vi.mocked(chatService.chat).mockResolvedValueOnce({
      text: "Envío a 06000 sale en $X",
      toolCalls: [],
      finishReason: "stop",
    } as any);

    const msg = makeIncomingMessage("Envío a CP 06000, está muy caro");
    await processMessage(msg);

    // CP guardado
    expect(clientRepo.update).toHaveBeenCalledWith(
      "5215551234567",
      expect.objectContaining({ codigoPostalEnvio: "06000" }),
      expect.anything()
    );
    // Objeción también disparada
    expect(objExtractor.extractObjecion).toHaveBeenCalled();
  });
});

