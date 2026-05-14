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
import * as visionAnalyzer from "../../intelligence/vision/analyzer";
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
vi.mock("../../intelligence/vision/analyzer");
vi.mock("../../observability/events");

function makeImageMessage(caption = ""): IncomingMessage {
  return {
    id: "msg-img-1",
    channel: "whatsapp",
    channelMessageId: "wamid.img",
    from: { id: "521", displayName: "Cliente" },
    to: { id: "525627301525" },
    type: "image",
    media: {
      nativeId: "meta_media_999",
      mimeType: "image/jpeg",
      sha256: "abc",
      caption,
    },
    receivedAt: new Date(),
    raw: {},
  };
}

describe("core: orchestrator (Fase 7 — vision integrada)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(promptBuilder.buildSystemPrompt).mockResolvedValue("SYS");
    vi.mocked(clientRepo.findOrCreate).mockResolvedValue({
      telefono: "521",
      nombre: "Cliente",
      segmento: "prospecto",
      totalCompras: 0,
      nivelConfianza: 40,
      tacticaActual: "valor_rendimiento",
      vectorObjeciones: {},
    } as any);
    vi.mocked(clientRepo.save).mockResolvedValue(undefined);
    vi.mocked(clientRepo.update).mockImplementation(
      async (_phone, patch) =>
        ({ telefono: "521", nombre: "Cliente", ...patch } as any)
    );
    vi.mocked(conversationRepo.getHistorial).mockResolvedValue([]);
    vi.mocked(conversationRepo.appendMensaje).mockResolvedValue([]);
    vi.mocked(conversationRepo.debeRegenerarResumen).mockReturnValue(false);
    vi.mocked(conversationRepo.getResumen).mockResolvedValue(null);
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

  it("analiza la imagen y pasa el enriched message a GPT", async () => {
    vi.mocked(visionAnalyzer.analyzeIncomingImage).mockResolvedValueOnce({
      analysis: {
        esProducto: true,
        descripcion: "tela polar afelpada azul marino",
        tipoTela: "polar",
        colores: ["azul marino"],
        atributos: ["afelpada"],
        usosProbables: ["sudaderas"],
        confianza: 0.85,
      },
      enrichedUserMessage:
        "[IMAGEN ANALIZADA] Descripción: tela polar afelpada azul marino",
      fromCache: false,
    });
    vi.mocked(chatService.chat).mockResolvedValueOnce({
      text: "Es muy similar a nuestra Alaska, $220/kg al menudeo. ¿Cuánto necesita?",
      toolCalls: [],
      finishReason: "stop",
    } as any);

    const responses = await processMessage(makeImageMessage());

    expect(visionAnalyzer.analyzeIncomingImage).toHaveBeenCalled();
    expect(chatService.chat).toHaveBeenCalled();

    // El user message que llega a chat() debe ser el enriched, no vacío
    const chatCall = vi.mocked(chatService.chat).mock.calls[0];
    const messages = chatCall[0] as any[];
    const userMsg = messages.find((m) => m.role === "user");
    expect(userMsg.content).toContain("IMAGEN ANALIZADA");

    expect(responses[0].text).toContain("Alaska");
  });

  it("si vision falla, el flujo sigue con caption como contexto", async () => {
    vi.mocked(visionAnalyzer.analyzeIncomingImage).mockRejectedValueOnce(
      new Error("network down")
    );
    vi.mocked(chatService.chat).mockResolvedValueOnce({
      text: "¿Me describe lo que necesita?",
      toolCalls: [],
      finishReason: "stop",
    } as any);

    const responses = await processMessage(
      makeImageMessage("a cuanto sale esto")
    );

    // El cliente recibe respuesta normal aunque vision haya fallado
    expect(responses[0].text).toContain("describe");

    const chatCall = vi.mocked(chatService.chat).mock.calls[0];
    const messages = chatCall[0] as any[];
    const userMsg = messages.find((m) => m.role === "user");
    expect(userMsg.content).toContain("a cuanto sale esto");
  });

  it("para imagen, NO llama a extractObjecion (no hay texto verbalizado)", async () => {
    vi.mocked(visionAnalyzer.analyzeIncomingImage).mockResolvedValueOnce({
      analysis: {
        esProducto: true,
        descripcion: "tela",
        colores: [],
        atributos: [],
        usosProbables: [],
        confianza: 0.7,
      },
      enrichedUserMessage: "[IMAGEN] tela",
      fromCache: false,
    });
    vi.mocked(chatService.chat).mockResolvedValueOnce({
      text: "respuesta",
      toolCalls: [],
      finishReason: "stop",
    } as any);

    await processMessage(makeImageMessage());

    expect(objExtractor.extractObjecion).not.toHaveBeenCalled();
  });

  it("para mensaje de texto normal, NO llama a vision", async () => {
    const textMsg: IncomingMessage = {
      ...makeImageMessage(),
      type: "text",
      text: "hola",
      media: undefined,
    };
    vi.mocked(chatService.chat).mockResolvedValueOnce({
      text: "Buen día",
      toolCalls: [],
      finishReason: "stop",
    } as any);

    await processMessage(textMsg);

    expect(visionAnalyzer.analyzeIncomingImage).not.toHaveBeenCalled();
    // SÍ se llamó al extractor de objeciones (hay texto real)
    expect(objExtractor.extractObjecion).toHaveBeenCalledWith("hola");
  });

  it("pasa la imagen junto con caption al analyzer", async () => {
    vi.mocked(visionAnalyzer.analyzeIncomingImage).mockResolvedValueOnce({
      analysis: {
        esProducto: true,
        descripcion: "x",
        colores: [],
        atributos: [],
        usosProbables: [],
        confianza: 0.7,
      },
      enrichedUserMessage: "[IMAGEN] x",
      fromCache: false,
    });
    vi.mocked(chatService.chat).mockResolvedValueOnce({
      text: "ok",
      toolCalls: [],
      finishReason: "stop",
    } as any);

    const msg = makeImageMessage("cuánto?");
    await processMessage(msg);

    // El analyzer recibe el message entero (con caption en media.caption)
    expect(visionAnalyzer.analyzeIncomingImage).toHaveBeenCalledWith(
      expect.objectContaining({
        media: expect.objectContaining({ caption: "cuánto?" }),
      }),
      expect.anything()
    );
  });
});

