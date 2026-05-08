import { getLogger } from "../observability/logger";
import type { ChatCompletionMessageToolCall } from "openai/resources/chat/completions";
import type { BotContext } from "../core/types";
import { calcularEnvioHandler } from "./handlers/calcular-envio";
import { generarCobroStripeHandler, generarCobroSpeiHandler } from "./handlers/generar-cobros";
import { escalarAHumanoHandler } from "./handlers/escalar";

const log = getLogger({ module: "tool-executor" });

export async function executeTool(toolCall: any, context: BotContext): Promise<any> {
  log.info({ tool: toolCall.function.name }, "Routing Tool Call");
  
  try {
    const args = JSON.parse(toolCall.function.arguments);
    
    switch (toolCall.function.name) {
      case "calcular_envio":
        return await calcularEnvioHandler(args, context);
      case "generar_cobro_stripe":
        return await generarCobroStripeHandler(args, context);
      case "generar_cobro_spei":
        return await generarCobroSpeiHandler(args, context);
      case "escalar_a_humano":
        return await escalarAHumanoHandler(args, context);
      case "actualizar_datos_cliente":
        // El perfil se actualiza en el orquestador principal, esto es solo feedback para GPT
        return { success: true, estado: "Base de datos actualizada silenciosamente." };
      default:
        log.warn({ tool: toolCall.function.name }, "Tool invocada no existe en el registro");
        return { error: `La herramienta ${toolCall.function.name} no está implementada.` };
    }
  } catch (error) {
    log.error({ err: error, tool: toolCall.function.name }, "Error ejecutando Tool");
    return { error: "Excepción interna del servidor al procesar los argumentos." };
  }
}
