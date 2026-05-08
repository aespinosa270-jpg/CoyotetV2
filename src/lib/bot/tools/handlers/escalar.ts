import type { BotContext } from "../../core/types";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "tool-escalar" });

export async function escalarAHumanoHandler(args: any, context: BotContext) {
  log.info({ args }, "Escalando conversación vía Tool");
  
  // Detenemos el flujo de IA para el futuro
  context.state.shouldAbort = true;
  context.state.abortReason = "escalated_to_human";
  
  return { 
    success: true, 
    instruccion_para_ia: "Informa al cliente que estás transfiriendo el chat a un asesor humano de la Jauría y despídete amablemente. No hagas más preguntas." 
  };
}
