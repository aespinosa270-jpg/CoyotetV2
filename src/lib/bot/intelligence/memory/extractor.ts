/**
 * Extractor de hechos episódicos por function calling.
 *
 * Después de cada turno del cliente, llamamos a GPT con la conversación
 * reciente para extraer 0..N hechos NUEVOS que valga la pena guardar.
 *
 * El extractor NO descubre hechos triviales (saludo, cortesía). Solo lo que
 * tiene valor de negocio: tipo de empresa, ubicación, escala, preferencias
 * persistentes, contacto interno, etc.
 *
 * Costo: 1 llamada cada N mensajes (configurable). Recomendación: cada 3-5
 * mensajes del cliente, no cada uno, para no quemar tokens.
 */
import type OpenAI from "openai";
import { chat, type ChatTool } from "../../services/openai/chat";
import { getLogger } from "../../observability/logger";
import {
  CATEGORIAS_HECHO,
  type CategoriaHecho,
  type HechoEpisodico,
} from "./types";

const log = getLogger({ module: "intelligence/memory/extractor" });

// ── Tool definition ───────────────────────────────────────────────

const EXTRAER_HECHOS_TOOL: ChatTool = {
  name: "extraer_hechos",
  description:
    "Registra los hechos NUEVOS y de valor de negocio detectados en la conversación. Devuelve array vacío si no hay nada nuevo importante.",
  parameters: {
    type: "object",
    properties: {
      hechos: {
        type: "array",
        items: {
          type: "object",
          properties: {
            hecho: {
              type: "string",
              maxLength: 120,
              description:
                "Hecho concreto en una frase corta. Ej: 'Tiene fábrica de uniformes escolares en Iztapalapa'.",
            },
            categoria: {
              type: "string",
              enum: [...CATEGORIAS_HECHO],
            },
            confianza: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description:
                "0.5=cliente lo mencionó de pasada. 0.9=lo dijo explícito. 1.0=confirmado dos veces.",
            },
            evidencia: {
              type: "string",
              maxLength: 100,
              description: "Frase específica del cliente que lo evidencia.",
            },
          },
          required: ["hecho", "categoria", "confianza"],
        },
      },
    },
    required: ["hechos"],
  },
};

const SYSTEM_PROMPT = `Eres un extractor de hechos de negocio para CRM B2B en español mexicano.
Recibes un fragmento de conversación entre un cliente y un vendedor textil.
Extrae SOLO hechos que valgan la pena guardar en el CRM porque informan ventas futuras.

Extrae:
- Tipo y giro del negocio del cliente
- Ubicación de tienda/fábrica/bodega
- Escala (al menudeo, mayoreo, pedidos mensuales aproximados)
- Preferencias persistentes (colores, telas, gramajes)
- Logística (horarios, zonas, condiciones de entrega)
- Frecuencia de compra ("compra cada X")
- Personas dentro de la empresa del cliente (encargado, dueño, jefe de compras)
- Objeciones que parecen ser crónicas, no solo del momento

NO extraigas:
- Saludos, cortesías
- Información de la conversación actual ("ahora pidió 50kg") — eso va en resumen semántico, no aquí
- Datos fiscales (esos viven en el perfil)
- Lo que ya está obvio en el perfil del cliente

Si no hay hechos NUEVOS que valgan la pena, devuelve un array vacío. NUNCA respondas con texto, SOLO usa la herramienta.`;

// ── Función principal ─────────────────────────────────────────────

export interface ExtractInput {
  /** Mensajes recientes del cliente para analizar. Idealmente últimos 3-5. */
  mensajesRecientes: string[];
  /** Hechos que ya tenemos guardados — se le pasan a GPT para evitar duplicados. */
  hechosExistentes?: string[];
}

export async function extractHechosEpisodicos(
  input: ExtractInput,
  client?: OpenAI
): Promise<HechoEpisodico[]> {
  if (input.mensajesRecientes.length === 0) return [];

  const userMsg = buildUserMessage(input);

  try {
    const response = await chat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      {
        tools: [EXTRAER_HECHOS_TOOL],
        toolChoice: { name: "extraer_hechos" },
        temperature: 0,
        maxTokens: 800,
      },
      client
    );

    const call = response.toolCalls[0];
    if (!call) {
      log.warn({}, "Extractor de hechos no devolvió tool call");
      return [];
    }

    const rawHechos = (call.arguments?.hechos ?? []) as Array<Record<string, unknown>>;
    if (!Array.isArray(rawHechos)) return [];

    const now = new Date().toISOString();
    return rawHechos
      .map((raw) => normalizeHecho(raw, now))
      .filter((h): h is HechoEpisodico => h !== null);
  } catch (err) {
    log.error({ err }, "Error extrayendo hechos episódicos");
    return [];
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function buildUserMessage(input: ExtractInput): string {
  const partes: string[] = [];

  if (input.hechosExistentes && input.hechosExistentes.length > 0) {
    partes.push(
      "Hechos que YA tengo guardados (NO los repitas):\n" +
        input.hechosExistentes.map((h) => `- ${h}`).join("\n")
    );
  }

  partes.push(
    "Mensajes recientes del cliente:\n" +
      input.mensajesRecientes.map((m, i) => `[${i + 1}] ${m}`).join("\n")
  );

  return partes.join("\n\n");
}

function normalizeHecho(
  raw: Record<string, unknown>,
  timestamp: string
): HechoEpisodico | null {
  const hecho = String(raw.hecho ?? "").trim();
  if (!hecho) return null;

  const rawCat = String(raw.categoria ?? "negocio");
  const categoria: CategoriaHecho = CATEGORIAS_HECHO.includes(
    rawCat as CategoriaHecho
  )
    ? (rawCat as CategoriaHecho)
    : "negocio";

  const rawConf = Number(raw.confianza ?? 0.5);
  const confianza = Math.max(0, Math.min(1, rawConf));

  const evidencia = raw.evidencia
    ? String(raw.evidencia).slice(0, 100)
    : undefined;

  return {
    hecho: hecho.slice(0, 120),
    categoria,
    confianza,
    timestamp,
    evidencia,
  };
}
