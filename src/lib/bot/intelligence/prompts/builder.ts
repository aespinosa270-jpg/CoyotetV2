/**
 * Constructor del system prompt para El Coyote.
 *
 * EVOLUCIÓN del prompt:
 *  - V1: "no inventes precios" sin dar catálogo → alucinaba popelina
 *  - V2 (popelina fix): + catálogo completo (~1000 tokens) + reglas anti-invención
 *  - V3 (Fase 5): + memoria episódica + objeciones + resumen
 *  - V4 (Fase 6, este): + RAG. Reemplaza catálogo completo por top 5 productos
 *    relevantes para la query del cliente. Ahorro: ~700-800 tokens por mensaje.
 *
 * El fallback al catálogo completo activa cuando:
 *  - shouldUseRag() devuelve false (saludo, smalltalk)
 *  - RAG no devolvió resultados (cliente pide algo no manejado)
 *  - RAG falla (Supabase caído)
 */
import type { Redis } from "@upstash/redis";
import type OpenAI from "openai";
import type { ClientePerfil } from "../../types/domain";
import { buildCatalogBlock } from "./catalog-block";
import { buildMemoryBlock } from "../memory/merger";
import { topObjeciones } from "../objections/tracker";
import { OBJECION_LABELS } from "../objections/types";
import { getMemoria } from "../../repositories/memory-repo";
import { getResumen } from "../../repositories/conversation-repo";
import {
  searchProducts,
  shouldUseRag,
} from "../rag/searcher";
import {
  buildRagBlock,
  extractQueryFromMessage,
} from "../rag/prompt-block";

export interface BuildPromptOptions {
  /** Mensaje actual del cliente — usado para RAG. Si no se pasa, no se hace RAG. */
  userMessage?: string;
  /** Redis client para fetch memoria + resumen. Default: singleton. */
  redis?: Redis;
  /** OpenAI client (opcional, para tests del RAG). */
  openaiClient?: OpenAI;
}

export async function buildSystemPrompt(
  perfil: ClientePerfil,
  isAdmin: boolean,
  options: BuildPromptOptions = {}
): Promise<string> {
  if (isAdmin) {
    return `ERES "EL COYOTE", IA DE COYOTE TEXTIL. HABLAS CON TU CREADOR.
Respuestas cortas. Tono de confianza entre socios. Tienes acceso completo a la base de datos vía tools.`;
  }

  // ── Decidir qué bloque de catálogo usar (RAG vs completo) ──
  const useRag =
    !!options.userMessage && shouldUseRag(options.userMessage);

  // Paralelizar las consultas
  const [catalogBlock, memoria, resumen, ragResults] = await Promise.all([
    // Solo cargamos el catálogo completo si NO usamos RAG (fallback)
    useRag ? Promise.resolve("") : buildCatalogBlock(),
    getMemoria(perfil.telefono, options.redis).catch(() => null),
    getResumen(perfil.telefono, options.redis).catch(() => null),
    // RAG solo si tiene sentido para este mensaje
    useRag
      ? searchProducts(
          extractQueryFromMessage(options.userMessage!),
          { k: 5, threshold: 0.5 },
          options.openaiClient
        ).catch(() => [])
      : Promise.resolve([]),
  ]);

  // Si pedimos RAG pero no devolvió nada, caemos al catálogo completo
  const productBlock =
    useRag && ragResults.length > 0
      ? buildRagBlock(ragResults)
      : useRag
        ? // RAG vacío Y no cargamos catálogo: cargarlo ahora como fallback
          await buildCatalogBlock()
        : catalogBlock;

  const base = `Eres EL COYOTE, asesor experto B2B de Coyote Textil.
SIEMPRE háblale de "usted" al cliente. Eres directo, resolutivo y tienes urgencia comercial B2B.
NO eres un bot ni una IA. Eres El Coyote.

REGLAS ABSOLUTAS:
1. Para cobrar con tarjeta u OXXO, DEBES invocar la herramienta 'generar_cobro_stripe'.
2. Para pagos por transferencia, DEBES invocar 'generar_cobro_spei'.
3. Para calcular fletes, DEBES invocar 'calcular_envio' en cuanto tengas el código postal.
4. Cierra siempre tus mensajes con una pregunta que dirija a la acción de compra.

REGLAS ANTI-INVENCIÓN (CRÍTICO):
A. SOLO puedes mencionar, recomendar o cotizar productos que aparecen en el bloque de productos de abajo.
B. Si el cliente pide una tela que NO está en el bloque (popelina, lino, mezclilla, casimir, gabardina, lana, seda, raso, organza, satín, muselina, terciopelo, etc.), responde con HONESTIDAD:
   "Esa tela no la manejamos. Nuestra especialidad son telas de punto para uniformes deportivos y prendas casuales (Sportok, Micropique, Felpa, Alaska, Kyoto, etc.). ¿Le interesa algo así para [su uso]?"
C. JAMÁS inventes precios, gramajes, composiciones o telas que no aparezcan en el bloque.
D. Si el cliente pregunta "¿cuál es la mejor tela para X?" donde X requiere una tela plana (paliacates, camisas formales, sábanas, manteles, prendas tejidas), DI HONESTAMENTE que no manejas ese tipo y redirige a usos de telas de punto.
E. Si dudas si un producto está en el catálogo, NO LO MENCIONES. Es preferible decir "déjeme revisar disponibilidad" que inventar.

${productBlock}`;

  const contextoCliente = `

CONTEXTO DEL CLIENTE:
- Nombre: ${perfil.nombre || "Desconocido"}
- Nivel de confianza: ${perfil.nivelConfianza || 40}/100
- Compras previas: ${perfil.totalCompras}
- Segmento: ${perfil.segmento || "prospecto"}
- Táctica de venta activa: ${perfil.tacticaActual || "valor_rendimiento"}`;

  // ── BLOQUES OPCIONALES (FASE 5) ──
  const memoryBlock = memoria ? buildMemoryBlock(memoria) : "";
  const objecionesTop = topObjeciones(perfil, 3);
  const objecionesBlock =
    objecionesTop.length > 0
      ? `\n\nOBJECIONES DETECTADAS (top 3, en orden de peso acumulado):\n${objecionesTop
          .map((o) => `- ${OBJECION_LABELS[o.tipo]} (peso: ${o.score.toFixed(1)})`)
          .join(
            "\n"
          )}\n→ Aborda estas objeciones DURANTE la conversación. NO las menciones explícitamente al cliente, úsalas para guiar tu argumentación.`
      : "";

  const resumenBlock =
    resumen && resumen.length > 0
      ? `\n\nRESUMEN DE LA CONVERSACIÓN HASTA AHORA:\n${resumen}`
      : "";

  return (
    base +
    contextoCliente +
    (memoryBlock ? "\n\n" + memoryBlock : "") +
    objecionesBlock +
    resumenBlock
  );
}
