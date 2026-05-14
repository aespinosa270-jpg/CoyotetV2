/**
 * Tipos relacionados al tracking de membresía en el perfil del cliente v2.
 *
 * El perfil ya existe (definido en types/domain.ts) — solo agregamos campos
 * opcionales relacionados a membresía. Como son opcionales, no rompemos
 * perfiles existentes en Redis.
 */
import type { MembershipTier } from "@prisma/client";

/**
 * Tracking de membresía a guardar en perfil del cliente.
 * Todo opcional para retro-compatibilidad.
 */
export interface MembershipTracking {
  /** Tier actual del cliente. Si undefined, asumimos NONE */
  tier?: MembershipTier;

  /** Veces que el bot le ha propuesto membresía */
  vecesPropuesta?: number;

  /** ISO timestamp de la última vez que el bot le propuso */
  ultimaPropuesta?: string;

  /** Si el cliente dijo explícitamente NO a la membresía */
  rechazoExplicito?: boolean;

  /** Si el cliente aceptó alguna vez (click en el link) */
  acepto?: { tier: MembershipTier; timestamp: string };
}
