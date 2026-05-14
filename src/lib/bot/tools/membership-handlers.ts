/**
 * Handlers para los 2 tools de membresía (Fase 11A).
 *
 * Integrados al executor.ts del proyecto.
 */
import type { BotContext } from "../core/types";
import { getInfoMembresiasCompleta } from "../intelligence/membership/decider";
import { recordEvent } from "../observability/events";
import { getLogger } from "../observability/logger";
import * as clientRepo from "../repositories/client-repo";

const log = getLogger({ module: "tools/membership" });

// ── obtener_info_membresias ─────────────────────────────────────────

export interface ObtenerInfoMembresiasArgs {
  plan_especifico?: "NONE" | "GOLD" | "BLACK" | "ELITE" | "TODOS";
}

export async function ejecutarObtenerInfoMembresias(
  args: ObtenerInfoMembresiasArgs,
  _ctx: BotContext
): Promise<unknown> {
  const todos = getInfoMembresiasCompleta();

  if (!args.plan_especifico || args.plan_especifico === "TODOS") {
    return {
      url_inscripcion: "https://www.coyotetextil.com/membresia",
      planes: todos,
      nota: "Para inscripción y pago el cliente debe ir a la URL. El bot NO procesa el pago directamente.",
    };
  }

  const plan = todos.find((p) => p.tier === args.plan_especifico);
  if (!plan) {
    return {
      error: `Plan ${args.plan_especifico} no existe`,
      planes_disponibles: ["NONE", "GOLD", "BLACK", "ELITE"],
    };
  }

  return {
    url_inscripcion: "https://www.coyotetextil.com/membresia",
    plan,
    nota: "Para inscripción el cliente debe ir a la URL.",
  };
}

// ── proponer_membresia ──────────────────────────────────────────────

export interface ProponerMembresiaArgs {
  plan_propuesto: "GOLD" | "BLACK" | "ELITE";
  motivo: "objecion_precio" | "compras_acumuladas" | "interes_explicito";
}

export async function ejecutarProponerMembresia(
  args: ProponerMembresiaArgs,
  ctx: BotContext
): Promise<unknown> {
  const phone = ctx.message.from.id;

  try {
    // Tracking previo desde el perfil (cast a any porque membershipTracking
    // es campo nuevo opcional)
    const profile = ctx.profile as any;
    const trackingActual = profile.membershipTracking ?? {};

    const nuevoTracking = {
      ...trackingActual,
      vecesPropuesta: (trackingActual.vecesPropuesta ?? 0) + 1,
      ultimaPropuesta: new Date().toISOString(),
      ultimoPlanPropuesto: args.plan_propuesto,
      ultimoMotivo: args.motivo,
    };

    await clientRepo.update(
      phone,
      { membershipTracking: nuevoTracking } as any,
      ctx.redis
    );

    // Observability
    await recordEvent({
      type: "objection",
      clientId: phone,
      channel: ctx.message.channel,
      data: {
        evento_real: "membresia_propuesta",
        plan: args.plan_propuesto,
        motivo: args.motivo,
        vecesPrevias: trackingActual.vecesPropuesta ?? 0,
      },
    });

    log.info(
      { phone, plan: args.plan_propuesto, motivo: args.motivo },
      "Membresía propuesta registrada"
    );

    return {
      ok: true,
      url_compartida: "https://www.coyotetextil.com/membresia",
    };
  } catch (err) {
    log.warn({ err, phone }, "Error registrando propuesta de membresía");
    return { ok: false, error: "no se pudo registrar tracking" };
  }
}
