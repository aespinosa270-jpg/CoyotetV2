/**
 * Servicio de inteligencia sobre membresías — V2 (Fase 11B).
 *
 * NUEVO en V2:
 *  - Devuelve `requierePedirConsentimiento` cuando el bot debería proponer
 *    pero el cliente aún no ha dado consentimiento de marketing.
 *  - El orchestrator inyecta instrucción extra al system prompt para que
 *    el bot pida consentimiento ANTES de proponer membresía.
 */
import {
  MEMBERSHIP_PLANS,
  TIER_ORDER,
  type MembershipTier,
} from "@/lib/membership-benefits";
import type { ObjecionDetectada } from "../objections/types";

// ── Tipos ──────────────────────────────────────────────────────────

export interface PropuestaMembresia {
  deberiaProponer: boolean;
  trigger: "objecion_precio" | "compras_acumuladas" | "ambos" | "ninguno";
  planSugerido: MembershipTier;
  beneficioDestacado?: string;
  yaEsPremium: boolean;
  /**
   * FASE 11B: si true, el bot debe pedir consentimiento ANTES de proponer.
   * El orchestrator inyecta texto al system prompt cuando ve esta bandera.
   */
  requierePedirConsentimiento?: boolean;
}

export interface ContextoMembresiaCliente {
  tierActual: MembershipTier;
  totalCompras: number;
  vecesPropuesta: number;
  ultimaPropuesta?: string;
  rechazoExplicito?: boolean;
  vetoMarketing?: { hasta: string };
  /**
   * FASE 11B: estado del consentimiento. Si "no_solicitado", el bot
   * debe pedirlo antes de proponer. Si "rechazado", no proponer.
   */
  consentEstado?: "no_solicitado" | "pendiente" | "otorgado" | "rechazado";
}

// ── Decisión de cuándo proponer ────────────────────────────────────

export function decidirPropuestaMembresia(
  ctx: ContextoMembresiaCliente,
  objecion: ObjecionDetectada
): PropuestaMembresia {
  const yaEsPremium =
    ctx.tierActual === "BLACK" || ctx.tierActual === "ELITE";

  const base: PropuestaMembresia = {
    deberiaProponer: false,
    trigger: "ninguno",
    planSugerido: "GOLD" as MembershipTier,
    yaEsPremium,
  };

  if (yaEsPremium) return base;

  if (ctx.vetoMarketing?.hasta) {
    const vetoMs = new Date(ctx.vetoMarketing.hasta).getTime();
    if (vetoMs > Date.now()) return base;
  }

  // FASE 11B: si rechazó consentimiento, NO proponer
  if (ctx.consentEstado === "rechazado") return base;

  if ((ctx.vecesPropuesta ?? 0) >= 3 && !ctx.rechazoExplicito) {
    if (ctx.ultimaPropuesta) {
      const diasDesde =
        (Date.now() - new Date(ctx.ultimaPropuesta).getTime()) /
        (1000 * 60 * 60 * 24);
      if (diasDesde < 14) return base;
    }
  }

  if (ctx.rechazoExplicito && ctx.ultimaPropuesta) {
    const diasDesdeRechazo =
      (Date.now() - new Date(ctx.ultimaPropuesta).getTime()) /
      (1000 * 60 * 60 * 24);
    if (diasDesdeRechazo < 30) return base;
  }

  const objetoPrecio =
    objecion.tipo === "precio_alto" && objecion.severidad >= 2;
  const acumulaCompras = (ctx.totalCompras ?? 0) >= 3;

  if (!objetoPrecio && !acumulaCompras) return base;

  let planSugerido: MembershipTier = "GOLD" as MembershipTier;
  if (ctx.totalCompras >= 10) {
    planSugerido = "BLACK" as MembershipTier;
  }

  let trigger: PropuestaMembresia["trigger"];
  if (objetoPrecio && acumulaCompras) trigger = "ambos";
  else if (objetoPrecio) trigger = "objecion_precio";
  else trigger = "compras_acumuladas";

  let beneficioDestacado: string | undefined;
  const plan = MEMBERSHIP_PLANS[planSugerido];

  if (objetoPrecio) {
    beneficioDestacado = `acumular ${plan.pointsPerHundred} pto${plan.pointsPerHundred === 1 ? "" : "s"} por cada $100 (que luego se canjean por descuentos) y obtener ${plan.benefits.find((b) => b.id === "colocacion" && b.available)?.label.toLowerCase() ?? "colocaciones gratis"}`;
  } else {
    beneficioDestacado = `${plan.benefits.find((b) => b.id === "colocacion" && b.available)?.label.toLowerCase() ?? "colocaciones gratis al mes"} más ${plan.pointsPerHundred} pto${plan.pointsPerHundred === 1 ? "" : "s"} por cada $100`;
  }

  // FASE 11B: si NO tenemos consentimiento todavía, hay que pedirlo PRIMERO
  const requierePedirConsentimiento =
    ctx.consentEstado === "no_solicitado" ||
    ctx.consentEstado === undefined;

  return {
    deberiaProponer: true,
    trigger,
    planSugerido,
    beneficioDestacado,
    yaEsPremium: false,
    requierePedirConsentimiento,
  };
}

// ── Bloque para el system prompt ───────────────────────────────────

export function buildPropuestaPromptBlock(
  propuesta: PropuestaMembresia,
  tierActualCliente: MembershipTier
): string {
  if (!propuesta.deberiaProponer) return "";

  const plan = MEMBERSHIP_PLANS[propuesta.planSugerido];
  const tierActualPlan = MEMBERSHIP_PLANS[tierActualCliente];

  // ── FASE 11B: Si requiere consentimiento, instrucción especial ──
  if (propuesta.requierePedirConsentimiento) {
    return `
## 🎯 PROPUESTA DE MEMBRESÍA — PRIMERO PEDIR CONSENTIMIENTO

El cliente cumple los criterios para que le propongas membresía, PERO antes
debes pedir su consentimiento para mandarle ofertas (cumplimiento legal).

### INSTRUCCIONES PRECISAS:
1. NO menciones la membresía ni precios todavía
2. En tu respuesta, ANTES de responder a lo que el cliente preguntó (o después,
   pero MUY brevemente), incluye textualmente este párrafo:

"Antes de continuar — para mandarle ofertas y novedades de membresías necesito su autorización. Aplican nuestro aviso de privacidad (https://www.coyotetextil.com/privacy) y términos (https://www.coyotetextil.com/terms). ¿Me autoriza? Responda *SÍ* o *NO*."

3. NO uses la herramienta 'proponer_membresia' en este turno. Solo cuando el
   cliente acepte podrás proponer en el siguiente turno.
4. Sigue atendiendo la consulta original del cliente en la misma respuesta.

EJEMPLO:
"Sí, la felpa polar la manejamos a $185/kg. Por cierto, antes de continuar —
para mandarle ofertas y novedades de membresías necesito su autorización.
Aplican nuestro aviso de privacidad (https://www.coyotetextil.com/privacy) y
términos (https://www.coyotetextil.com/terms). ¿Me autoriza? Responda *SÍ* o
*NO*."
`.trim();
  }

  // ── Camino normal: ya hay consentimiento, proponer membresía ──
  let triggerContexto = "";
  switch (propuesta.trigger) {
    case "objecion_precio":
      triggerContexto =
        "El cliente acaba de objetar el precio. Es un BUEN momento para mencionar que con la membresía premium puede ahorrar.";
      break;
    case "compras_acumuladas":
      triggerContexto =
        "El cliente ya tiene 3+ compras con nosotros. Es un cliente que claramente se beneficiaría de una membresía.";
      break;
    case "ambos":
      triggerContexto =
        "El cliente tiene 3+ compras Y acaba de objetar el precio. El momento perfecto para proponer la membresía.";
      break;
  }

  return `
## 🎯 PROPUESTA DE MEMBRESÍA SUGERIDA

${triggerContexto}

**Plan actual del cliente**: ${tierActualPlan.name} (${tierActualCliente === "NONE" ? "sin suscripción" : "$" + tierActualPlan.priceMonthly + "/mes"})
**Plan a proponer**: ${plan.name} ($${plan.priceMonthly}/mes)
**Beneficio principal a destacar**: ${propuesta.beneficioDestacado}

### REGLAS para mencionar la membresía:
1. NUNCA mencionar la membresía de forma agresiva o repetitiva
2. Hazlo en UNA frase corta, integrada al flujo de tu respuesta
3. Termina con UNA pregunta abierta del tipo: "¿le interesa que le cuente más?" o "¿quiere que le mande el link?"
4. Si el cliente dice NO o ignora, NO insistas en la siguiente respuesta
5. Menciona el nombre del plan literalmente: "${plan.name}"
6. Si vas a dar el link, usa: https://www.coyotetextil.com/membresia
7. NO inventes beneficios — solo menciona el "beneficio principal a destacar" arriba
8. Después de proponer, LLAMA la herramienta 'proponer_membresia' con plan_propuesto="${propuesta.planSugerido}" y motivo="${propuesta.trigger === "ambos" ? "objecion_precio" : propuesta.trigger}"

### EJEMPLOS de cómo integrarlo:
✅ "Por cierto, viendo que es cliente frecuente, con nuestro plan ${plan.name} a $${plan.priceMonthly}/mes incluye ${propuesta.beneficioDestacado}. ¿Le interesa saber más?"
✅ "Si quiere ahorrar, hay una opción: el plan ${plan.name} le da ${propuesta.beneficioDestacado}. ¿Le mando el link?"
❌ "¡COMPRE LA MEMBRESÍA!" (demasiado agresivo)
❌ Mencionar TODOS los beneficios (abrumador)
`.trim();
}

// ── Info completa para tool calls ──────────────────────────────────

export function getInfoMembresiasCompleta() {
  return TIER_ORDER.map((tier) => {
    const plan = MEMBERSHIP_PLANS[tier];
    return {
      tier,
      nombre: plan.name,
      tagline: plan.tagline,
      precioMensual: plan.priceMonthly,
      puntosPor100MXN: plan.pointsPerHundred,
      beneficiosIncluidos: plan.benefits
        .filter((b) => b.available)
        .map((b) => ({ label: b.label, detalle: b.detail })),
    };
  });
}
