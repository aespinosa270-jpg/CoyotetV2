import { getLogger } from "../observability/logger";
import { getRedis } from "../repositories/redis";
import * as clientRepo from "../repositories/client-repo";
import * as conversationRepo from "../repositories/conversation-repo";
import { buildSystemPrompt } from "../intelligence/prompts/builder";
import { chat } from "../services/openai/chat";
import { BOT_TOOLS } from "../tools/definitions";
import { executeTool } from "../tools/executor";
import type { IncomingMessage, OutgoingMessage } from "../types/messages";
import type { BotContext } from "./types";
import type { ChatCompletionMessageToolCall } from "openai/resources/chat/completions";

const log = getLogger({ module: "orchestrator" });

export async function processMessage(message: IncomingMessage): Promise<OutgoingMessage[]> {
  const redis = getRedis();
  const phone = message.from.id;
  const userText = message.text || "";
  
  try {
    const profile = await clientRepo.findOrCreate(phone, redis);
    const history = await conversationRepo.getHistorial(phone, redis);
    const isAdmin = userText.trim().toLowerCase() === "elcoyote56";

    const context: BotContext = {
      message, redis, profile, history, isAdmin,
      state: { shouldAbort: false }
    };

    const apiMessages: any[] = [
      { role: "system", content: buildSystemPrompt(profile, isAdmin) },
      ...history,
      { role: "user", content: userText }
    ];

    let response = await chat(apiMessages, { tools: BOT_TOOLS as any });
    let finalTexto = response.text;

    if (response.toolCalls && response.toolCalls.length > 0) {
      apiMessages.push({ role: "assistant", content: "", tool_calls: response.toolCalls });

      for (const call of response.toolCalls) {
        // Usamos 'any' para saltarnos la burocracia de los tipos de OpenAI
        const toolCall = call as any;
        const result = await executeTool(toolCall, context);
        
        apiMessages.push({ 
          role: "tool", 
          tool_call_id: toolCall.id, 
          name: toolCall.function.name, 
          content: JSON.stringify(result) 
        });
      }

      if (context.state.shouldAbort) {
        return [{
          channel: message.channel,
          to: { id: phone },
          type: "text",
          text: "Un momento, lo comunico con la Jauría."
        }];
      }

      const round2 = await chat(apiMessages, { tools: BOT_TOOLS as any });
      finalTexto = round2.text;
    }

    // CORREGIDO: Usamos appendMensaje, que es el nombre real en tu repositorio
    await conversationRepo.appendMensaje(phone, { role: "user", content: userText } as any, redis);
    await conversationRepo.appendMensaje(phone, { role: "assistant", content: finalTexto } as any, redis);

    return [{
      channel: message.channel,
      to: { id: phone },
      type: "text",
      text: finalTexto
    }];

  } catch (error) {
    log.error({ err: error, phone }, "Error crítico");
    return [{
      channel: message.channel,
      to: { id: phone },
      type: "text",
      text: "🐺 Denos un momento y le daremos seguimiento."
    }];
  }
}