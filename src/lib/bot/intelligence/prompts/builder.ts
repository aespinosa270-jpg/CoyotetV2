/**
 * Constructor del system prompt para El Coyote — V7.
 *
 * EVOLUCIÓN:
 *  - V1: "no inventes precios" sin catálogo → alucinaba popelina
 *  - V2 (popelina fix): + catálogo completo + reglas anti-invención
 *  - V3 (Fase 5): + memoria + objeciones + resumen
 *  - V4 (Fase 6): + RAG
 *  - V5 (fix-runtime): + tone y extraInstructions
 *  - V6 (Fase 11A): + bloque de propuesta de membresía
 *  - V7 (Fase 11B): + el bloque ahora considera consentimiento de marketing
 *
 * Cambios en V7:
 *  - buildMembershipBlock recibe el perfil completo (para leer consentimiento)
 */
import type { Redis } from "@upstash/redis";
import type OpenAI from "openai";
import type { ClientePerfil } from "../../types/domain";
import type { ObjecionDetectada } from "../objections/types";
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
import { getRuntimeConfig } from "../../config/runtime-config";
import { buildMembershipBlock } from "./membership-block";

export interface BuildPromptOptions {
  userMessage?: string;
  redis?: Redis;
  openaiClient?: OpenAI;
  objecionActual?: ObjecionDetectada;
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

  const useRag = !!options.userMessage && shouldUseRag(options.userMessage);

  const [catalogBlock, memoria, resumen, ragResults, runtimeConfig] =
    await Promise.all([
      useRag ? Promise.resolve("") : buildCatalogBlock(),
      getMemoria(perfil.telefono, options.redis).catch(() => null),
      getResumen(perfil.telefono, options.redis).catch(() => null),
      useRag
        ? searchProducts(
            extractQueryFromMessage(options.userMessage!),
            { k: 5, threshold: 0.5 },
            options.openaiClient
          ).catch(() => [])
        : Promise.resolve([]),
      getRuntimeConfig(options.redis).catch(() => null),
    ]);

  const productBlock =
    useRag && ragResults.length > 0
      ? buildRagBlock(ragResults)
      : useRag
        ? await buildCatalogBlock()
        : catalogBlock;

  const toneBlock = runtimeConfig?.tone
    ? `\nTONO ESPECIAL: ${runtimeConfig.tone}`
    : "";

  const base = `Eres EL COYOTE, asesor experto B2B de Coyote Textil.
SIEMPRE háblale de "usted" al cliente. Eres directo, resolutivo y tienes urgencia comercial B2B.
NO eres un bot ni una IA. Eres El Coyote.${toneBlock}

REGLAS ABSOLUTAS:
1. Para cobrar con tarjeta u OXXO, DEBES invocar la herramienta 'generar_cobro_stripe'.
2. Para pagos por transferencia, DEBES invocar 'generar_cobro_spei'.
3. Para calcular fletes, DEBES invocar 'calcular_envio' en cuanto tengas el código postal.
4. Cierra siempre tus mensajes con una pregunta que dirija a la acción de compra.
5. EVITA REPETIR información ya dada en mensajes previos del historial. Si el turno anterior ya mencionó una tela, no la vuelvas a explicar — solo agrega valor nuevo.
5. SÍ TIENES VISION HABILITADA — puedes analizar fotos que el cliente envía. NUNCA digas "no puedo ver imágenes" ni "no tengo capacidad de ver fotos". Si el cliente menciona una imagen pero no tienes su análisis en el turno actual, responde: "Permítame revisar bien la imagen, ¿podría reenviarla?" en lugar de negar tu capacidad. Si SÍ tienes el análisis de una imagen previa en el historial, úsalo libremente para responder.

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
  const extraBlock = runtimeConfig?.extraInstructions
    ? `\n\nINSTRUCCIONES ADICIONALES VIGENTES (del admin):\n${runtimeConfig.extraInstructions}`
    : "";

  // ── FASE 11A/B: bloque de propuesta de membresía si aplica ──
  const tracking = (perfil as any).membershipTracking ?? {};
  const vetoMarketing = (perfil as any).vetoMarketing;
  const objecionParaDecider: ObjecionDetectada = options.objecionActual ?? {
    tipo: "ninguna",
    severidad: 1,
    contexto: "",
  };
  const membershipBlockText = buildMembershipBlock({
    profile: perfil,
    tierActual: tracking.tier ?? "NONE",
    totalCompras: perfil.totalCompras ?? 0,
    vecesPropuesta: tracking.vecesPropuesta ?? 0,
    ultimaPropuesta: tracking.ultimaPropuesta,
    rechazoExplicito: tracking.rechazoExplicito,
    vetoMarketing,
    objecionActual: objecionParaDecider,
  });
  const membershipBlock = membershipBlockText
    ? "\n\n" + membershipBlockText
    : "";

  return (
    base +
    contextoCliente +
    (memoryBlock ? "\n\n" + memoryBlock : "") +
    objecionesBlock +
    resumenBlock +
    extraBlock +
    membershipBlock
  );
}
