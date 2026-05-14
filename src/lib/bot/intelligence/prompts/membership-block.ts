/**
 * Helper para integrar en `builder.ts` del system prompt.
 *
 * V2 (Fase 11B): incluye `consentEstado` del cliente en el contexto.
 */
import type { ObjecionDetectada } from "../objections/types";
import type { MembershipTier } from "@prisma/client";
import {
  decidirPropuestaMembresia,
  buildPropuestaPromptBlock,
} from "../membership/decider";
import { getConsentInfo } from "../../repositories/consent-repo";

export interface BuildMembershipBlockInput {
  /** Perfil completo del cliente (para leer consentimiento) */
  profile: any;
  /** Tier actual del cliente (default NONE) */
  tierActual?: MembershipTier;
  /** Total de compras históricas del cliente */
  totalCompras: number;
  /** Veces que ya se le propuso */
  vecesPropuesta?: number;
  /** Última propuesta (ISO timestamp) */
  ultimaPropuesta?: string;
  /** Si rechazó explícitamente */
  rechazoExplicito?: boolean;
  /** Veto de marketing */
  vetoMarketing?: { hasta: string };
  /** Objeción detectada en este turno (puede ser "ninguna") */
  objecionActual: ObjecionDetectada;
}

/**
 * Devuelve un bloque de prompt para inyectar en el system prompt,
 * o string vacío si no se debe proponer membresía ahora.
 *
 * V2: Considera el estado de consentimiento.
 */
export function buildMembershipBlock(input: BuildMembershipBlockInput): string {
  const tierActual = input.tierActual ?? ("NONE" as MembershipTier);
  const consentInfo = getConsentInfo(input.profile);

  const propuesta = decidirPropuestaMembresia(
    {
      tierActual,
      totalCompras: input.totalCompras ?? 0,
      vecesPropuesta: input.vecesPropuesta ?? 0,
      ultimaPropuesta: input.ultimaPropuesta,
      rechazoExplicito: input.rechazoExplicito,
      vetoMarketing: input.vetoMarketing,
      consentEstado: consentInfo.estado,
    },
    input.objecionActual
  );

  if (!propuesta.deberiaProponer) return "";

  return buildPropuestaPromptBlock(propuesta, tierActual);
}
