/**
 * Extractor de objeciones por function calling.
 *
 * El v1 detectaba objeciones por regex (signals.ts). Esto era buen pre-filtro
 * pero perdía matiz: "el precio está bien pero los tiempos son largos" se
 * detectaba como dos señales sueltas, no como UNA objeción específica de tiempo.
 *
 * Con function calling, GPT clasifica la objeción real en una categoría fija
 * y le pone severidad de 1-5. Salida estructurada → vectorObjeciones limpio.
 *
 * COSTO: 1 llamada extra a GPT-4o por mensaje del cliente (~$0.001). Se puede
 * batchear con el extractor de memoria si se quiere optimizar.
 */
import { chat, type ChatTool } from "../../services/openai/chat";
import { getLogger } from "../../observability/logger";
import type OpenAI from "openai";
import {
  TIPOS_OBJECION,
  type ObjecionDetectada,
  type SeveridadObjecion,
  type TipoObjecion,
} from "./types";

const log = getLogger({ module: "intelligence/objections/extractor" });

// ── Tool definition ────────────────────────────────────────────────

const REGISTRAR_OBJECION_TOOL: ChatTool = {
  name: "registrar_objecion",
  description:
    "Clasifica la objeción detectada en el último mensaje del cliente. Si el cliente no expresa objeción, usa tipo='ninguna' con severidad=1.",
  parameters: {
    type: "object",
    properties: {
      tipo: {
        type: "string",
        enum: [...TIPOS_OBJECION],
        description:
          "Categoría de la objeción. Usar 'ninguna' si no hay objeción real.",
      },
      severidad: {
        type: "integer",
        minimum: 1,
        maximum: 5,
        description:
          "1 = mencionada de pasada, 3 = consideración real, 5 = bloqueante para la venta",
      },
      contexto: {
        type: "string",
        description:
          "Frase específica del cliente (máx 80 chars) que evidencia la objeción. Vacío si tipo='ninguna'.",
        maxLength: 80,
      },
    },
    required: ["tipo", "severidad", "contexto"],
  },
};

const SYSTEM_PROMPT = `Eres un clasificador de objeciones de venta B2B en español mexicano.
Recibes el mensaje del cliente y lo clasificas en UNA categoría usando la herramienta 'registrar_objecion'.

Categorías:
- precio_alto: cliente cuestiona el precio o pide descuento
- tiempo_entrega: cliente preocupado por velocidad/fecha de llegada
- calidad_dudas: cuestiona resistencia, gramaje, durabilidad
- metodo_pago: prefiere otro método o lo complica
- competencia: menciona otro proveedor o "lo encontré más barato"
- pedido_minimo: cuestiona la cantidad mínima requerida
- factura_complicada: complicaciones con datos fiscales
- logistica_envio: zona difícil, sin acceso, horarios
- stock_disponibilidad: pregunta si hay stock, color, etc.
- cierre_postergado: "lo pienso", "después", "mañana", "luego"
- ninguna: el mensaje no expresa objeción

NUNCA respondas con texto. SOLO usa la herramienta.`;

// ── Función principal ─────────────────────────────────────────────

export async function extractObjecion(
  mensajeCliente: string,
  client?: OpenAI
): Promise<ObjecionDetectada> {
  if (!mensajeCliente || mensajeCliente.trim().length === 0) {
    return { tipo: "ninguna", severidad: 1, contexto: "" };
  }

  try {
    const response = await chat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: mensajeCliente },
      ],
      {
        tools: [REGISTRAR_OBJECION_TOOL],
        toolChoice: { name: "registrar_objecion" },
        temperature: 0,
        maxTokens: 150,
      },
      client
    );

    const call = response.toolCalls[0];
    if (!call || call.name !== "registrar_objecion") {
      log.warn({ mensajeCliente }, "Extractor no devolvió tool call");
      return { tipo: "ninguna", severidad: 1, contexto: "" };
    }

    return normalizeArgs(call.arguments);
  } catch (err) {
    log.error({ err, mensajeCliente }, "Error extrayendo objeción");
    // Fail-open: si falla la extracción, asumimos sin objeción.
    // El bot no se rompe, solo pierde una oportunidad de tracking.
    return { tipo: "ninguna", severidad: 1, contexto: "" };
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function normalizeArgs(args: Record<string, unknown>): ObjecionDetectada {
  const rawTipo = String(args.tipo ?? "ninguna");
  const tipo: TipoObjecion = (TIPOS_OBJECION as readonly string[]).includes(rawTipo)
    ? (rawTipo as TipoObjecion)
    : "ninguna";

  const rawSev = Number(args.severidad ?? 1);
  const severidad = Math.max(1, Math.min(5, Math.round(rawSev))) as SeveridadObjecion;

  const contexto = String(args.contexto ?? "").slice(0, 80);

  return { tipo, severidad, contexto };
}
