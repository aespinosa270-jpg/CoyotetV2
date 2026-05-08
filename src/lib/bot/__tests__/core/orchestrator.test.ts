import { describe, it, expect, vi, beforeEach } from "vitest";
import { processMessage } from "../../core/orchestrator";
import * as chatService from "../../services/openai/chat";
import * as clientRepo from "../../repositories/client-repo";
import * as conversationRepo from "../../repositories/conversation-repo";
import * as executor from "../../tools/executor";
import type { IncomingMessage } from "../../types/messages";

vi.mock("../../services/openai/chat");
vi.mock("../../repositories/client-repo");
vi.mock("../../repositories/conversation-repo", () => ({ getHistory: vi.fn(), addMessage: vi.fn() }));
vi.mock("../../tools/executor");

describe("core: orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clientRepo.findOrCreate).mockResolvedValue({ nombre: "Test", segmento: "nuevo" } as any);
    vi.mocked(conversationRepo.getHistory).mockResolvedValue([]);
  });

  it("procesa un mensaje de texto simple (Round 1 directo sin tools)", async () => {
    vi.mocked(chatService.chat).mockResolvedValueOnce({ text: "Hola soy El Coyote", toolCalls: [] });

    const msg: IncomingMessage = { id: "1", channel: "whatsapp", senderId: "52123", phone: "52123", text: "Hola", timestamp: new Date() };
    const responses = await processMessage(msg);

    expect(responses).toHaveLength(1);
    expect(responses[0].text).toBe("Hola soy El Coyote");
    expect(chatService.chat).toHaveBeenCalledTimes(1);
  });

  it("ejecuta el Round 2 si GPT decide usar una tool", async () => {
    // Round 1: GPT no devuelve texto, pero pide usar 'calcular_envio'
    vi.mocked(chatService.chat).mockResolvedValueOnce({
      text: "",
      toolCalls: [{ id: "call_1", type: "function", function: { name: "calcular_envio", arguments: "{}" } }]
    });
    
    // El executor hace su magia
    vi.mocked(executor.executeTool).mockResolvedValueOnce({ success: true, total_a_cobrar: 150 });
    
    // Round 2: GPT recibe el resultado de la tool y formula la respuesta final
    vi.mocked(chatService.chat).mockResolvedValueOnce({
      text: "El envío sale en $150 MXN. ¿Le genero el link de pago?",
      toolCalls: []
    });

    const msg: IncomingMessage = { id: "2", channel: "whatsapp", senderId: "52123", phone: "52123", text: "Envío a 57170", timestamp: new Date() };
    const responses = await processMessage(msg);

    expect(executor.executeTool).toHaveBeenCalledTimes(1);
    expect(chatService.chat).toHaveBeenCalledTimes(2); // Verifica el loop de 2 rondas
    expect(responses[0].text).toContain("$150");
  });

  it("aborta el flujo si el state.shouldAbort es true (ej. escalamiento)", async () => {
    vi.mocked(chatService.chat).mockResolvedValueOnce({
      text: "",
      toolCalls: [{ id: "call_1", type: "function", function: { name: "escalar_a_humano", arguments: "{}" } }]
    });
    
    // Simulamos que el handler de escalar levantó la bandera de aborto
    vi.mocked(executor.executeTool).mockImplementationOnce(async (_call, context) => {
      context.state.shouldAbort = true;
      return { success: true };
    });

    const msg: IncomingMessage = { id: "3", channel: "whatsapp", senderId: "52123", phone: "52123", text: "Quiero hablar con un humano", timestamp: new Date() };
    const responses = await processMessage(msg);

    // Debe detenerse en 1 sola llamada a chat (no hay Round 2)
    expect(chatService.chat).toHaveBeenCalledTimes(1);
    expect(responses[0].text).toContain("lo comunico con la Jauría");
  });
});
