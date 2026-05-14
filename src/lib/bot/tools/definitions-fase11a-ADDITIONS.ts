/**
 * Tools del Bot v2 para function calling.
 *
 * Esto se importa en orchestrator y se pasa al LLM en cada call.
 * El executor (executor.ts) recibe el nombre + args y ejecuta la acción real.
 *
 * NOTA: Si tu archivo actual de definitions.ts tiene MÁS tools que estos,
 * usa este archivo como REFERENCIA para AGREGAR los 2 nuevos al final
 * de tu array existente. NO sobreescribas tu archivo si tiene más tools.
 *
 * Los 2 tools nuevos de Fase 11A son:
 *  - obtener_info_membresias: el LLM puede consultar planes/precios/beneficios
 *  - proponer_membresia: registra que el bot propuso (para tracking)
 */

export const BOT_TOOLS = [
  // ── EXISTENTES (mantener los que ya tienes) ──
  // Aquí van todos los tools que ya tienes (cobro_stripe, cobro_spei, etc.)
  // Esta lista es ILUSTRATIVA — usa tu archivo actual como base.

  // ── NUEVOS Fase 11A ──
  {
    type: "function" as const,
    function: {
      name: "obtener_info_membresias",
      description:
        "Devuelve la información completa de los 4 planes de membresía de Coyote Textil: NONE (acceso base), GOLD (Socio Comercial $299/mes), BLACK (Socio Ejecutivo $699/mes), ELITE (Master Partner $1129/mes). Llamar SOLO cuando el cliente pregunta directamente '¿qué membresías hay?', '¿cuánto cuesta la membresía?', '¿qué beneficios tiene la membresía gold?' o similares. No llamar para proponer membresía proactivamente (el contexto del prompt ya tiene esa info).",
      parameters: {
        type: "object",
        properties: {
          plan_especifico: {
            type: "string",
            enum: ["NONE", "GOLD", "BLACK", "ELITE", "TODOS"],
            description:
              "Si el cliente pregunta por un plan específico, pasar ese. Si pregunta en general, pasar 'TODOS'. Default: TODOS",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "proponer_membresia",
      description:
        "Registrar que el bot acaba de proponer una membresía al cliente, para fines de tracking (no spamear). Llamar SOLO cuando efectivamente mencionaste la membresía en tu respuesta como sugerencia proactiva (no cuando el cliente preguntó él mismo). El cliente recibirá el link a https://www.coyotetextil.com/membresia.",
      parameters: {
        type: "object",
        properties: {
          plan_propuesto: {
            type: "string",
            enum: ["GOLD", "BLACK", "ELITE"],
            description:
              "Plan que mencionaste al cliente. Si dudaste, usa GOLD que es el más accesible.",
          },
          motivo: {
            type: "string",
            enum: ["objecion_precio", "compras_acumuladas", "interes_explicito"],
            description: "Por qué propusiste la membresía",
          },
        },
        required: ["plan_propuesto", "motivo"],
      },
    },
  },
] as const;
