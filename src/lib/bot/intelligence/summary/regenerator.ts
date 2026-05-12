/**
 * Regenerador del resumen semántico de la conversación.
 *
 * El historial bruto crece hasta 80 mensajes (MEMORY.MAX_HISTORY_LENGTH).
 * Mandar todo eso a GPT cada turno es caro y la atención del modelo se diluye.
 *
 * Solución: cada N mensajes (10 por default — ver `debeRegenerarResumen` en
 * conversation-repo), regeneramos un resumen condensado de 4-6 párrafos que
 * captura lo importante: qué pidió, qué cotizamos, qué se decidió, qué quedó
 * pendiente.
 *
 * El system prompt usa el resumen + los últimos N mensajes brutos, NO el
 * historial completo. Esto da contexto sin perder los matices de los
 * mensajes recientes.
 */
import type OpenAI from "openai";
import { chat } from "../../services/openai/chat";
import { getLogger } from "../../observability/logger";
import type { MensajeHistorial } from "../../types/domain";

const log = getLogger({ module: "intelligence/summary/regenerator" });

const SYSTEM_PROMPT = `Eres un resumidor de conversaciones de venta B2B en español mexicano.
Recibes el historial completo de una conversación entre cliente y vendedor.
Devuelve un resumen ESTRUCTURADO de 4 secciones, en total no más de 250 palabras:

1. PETICIÓN DEL CLIENTE: qué producto/cantidad pidió, para qué uso.
2. COTIZACIÓN ENTREGADA: precios cotizados, envío calculado, total.
3. ESTADO ACTUAL: dónde se quedó la conversación, qué falta para cerrar.
4. ALERTAS Y OBJECIONES: objeciones que el cliente expresó, dudas pendientes, próximo paso.

Usa frases cortas. No uses listas con guiones, solo párrafos compactos.
NUNCA inventes datos que no estén en el historial.`;

export interface RegenerateInput {
  historial: MensajeHistorial[];
  /** Resumen anterior, si existe. Sirve para continuidad. */
  resumenAnterior?: string;
}

export async function regenerateSummary(
  input: RegenerateInput,
  client?: OpenAI
): Promise<string> {
  if (input.historial.length < 3) {
    return ""; // muy poco historial, no vale resumen
  }

  const transcript = formatHistorial(input.historial);
  const userMsg = input.resumenAnterior
    ? `Resumen previo:\n${input.resumenAnterior}\n\nHistorial completo actualizado:\n${transcript}\n\nGenera el nuevo resumen actualizado.`
    : `Historial:\n${transcript}\n\nGenera el resumen.`;

  try {
    const response = await chat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      {
        temperature: 0.2,
        maxTokens: 500,
      },
      client
    );

    const text = response.text.trim();
    log.debug(
      { length: text.length, mensajes: input.historial.length },
      "Resumen semántico regenerado"
    );
    return text;
  } catch (err) {
    log.error({ err }, "Error regenerando resumen");
    // Devolvemos el resumen anterior si lo hay, para no perder contexto
    return input.resumenAnterior ?? "";
  }
}

function formatHistorial(mensajes: MensajeHistorial[]): string {
  return mensajes
    .map((m) => `${m.role === "user" ? "CLIENTE" : "BOT"}: ${m.content}`)
    .join("\n");
}
