/**
 * Repositorio del estado de consentimiento de marketing del cliente.
 *
 * Se guarda en el perfil del cliente (v2:cliente:{phone}) como un campo
 * adicional. Como cualquier campo opcional, no rompe perfiles existentes.
 *
 * Estados:
 *  - "no_solicitado": el bot nunca le ha preguntado
 *  - "otorgado":      dijo SÍ explícito (con timestamp y versión de términos)
 *  - "rechazado":     dijo NO explícito (con timestamp; respeta 6 meses)
 *  - "pendiente":     el bot le preguntó pero todavía no respondió (estado transitorio)
 */
import type { Redis } from "@upstash/redis";
import * as clientRepo from "./client-repo";
import { CONSENT_VERSION } from "../intelligence/consent/detector";
import { getLogger } from "../observability/logger";

const log = getLogger({ module: "consent-repo" });

export type ConsentEstado =
  | "no_solicitado"
  | "pendiente"
  | "otorgado"
  | "rechazado";

export interface ConsentInfo {
  estado: ConsentEstado;
  timestamp?: string;
  versionTerminos?: string;
  /** Si rechazó, hasta cuándo respetar el veto (6 meses). */
  vetoHasta?: string;
}

const VETO_DURATION_MS = 6 * 30 * 24 * 60 * 60 * 1000; // ~6 meses

// ── Lectura ──────────────────────────────────────────────────────

/**
 * Devuelve el estado actual de consentimiento del cliente.
 * Default: "no_solicitado" si no hay info en el perfil.
 *
 * También verifica si el veto de un "rechazado" ya expiró → vuelve a
 * "no_solicitado" para que el bot pueda volver a preguntar.
 */
export function getConsentInfo(profile: any): ConsentInfo {
  const raw = profile?.consentimientoPromociones;
  if (!raw || typeof raw !== "object") {
    return { estado: "no_solicitado" };
  }

  // Si el cliente rechazó pero ya pasaron 6 meses, podemos volver a preguntar
  if (raw.estado === "rechazado" && raw.vetoHasta) {
    const vetoMs = new Date(raw.vetoHasta).getTime();
    if (!isNaN(vetoMs) && vetoMs < Date.now()) {
      return { estado: "no_solicitado" };
    }
  }

  // Si la versión de términos cambió, considerar "no_solicitado" para
  // re-preguntar (compliance con cambio de términos)
  if (raw.estado === "otorgado" && raw.versionTerminos !== CONSENT_VERSION) {
    log.info(
      { from: raw.versionTerminos, to: CONSENT_VERSION },
      "Version de términos cambió, re-solicitar consentimiento"
    );
    return { estado: "no_solicitado" };
  }

  return {
    estado: raw.estado as ConsentEstado,
    timestamp: raw.timestamp,
    versionTerminos: raw.versionTerminos,
    vetoHasta: raw.vetoHasta,
  };
}

// ── Escritura ────────────────────────────────────────────────────

export async function marcarPendiente(
  phone: string,
  redis: Redis
): Promise<void> {
  const info: ConsentInfo = {
    estado: "pendiente",
    timestamp: new Date().toISOString(),
    versionTerminos: CONSENT_VERSION,
  };
  await clientRepo.update(
    phone,
    { consentimientoPromociones: info } as any,
    redis
  );
  log.info({ phone }, "Consentimiento: marcado como pendiente (bot preguntó)");
}

export async function marcarOtorgado(
  phone: string,
  redis: Redis
): Promise<void> {
  const info: ConsentInfo = {
    estado: "otorgado",
    timestamp: new Date().toISOString(),
    versionTerminos: CONSENT_VERSION,
  };
  await clientRepo.update(
    phone,
    { consentimientoPromociones: info } as any,
    redis
  );
  log.info({ phone }, "Consentimiento: cliente OTORGÓ permiso");
}

export async function marcarRechazado(
  phone: string,
  redis: Redis
): Promise<void> {
  const info: ConsentInfo = {
    estado: "rechazado",
    timestamp: new Date().toISOString(),
    versionTerminos: CONSENT_VERSION,
    vetoHasta: new Date(Date.now() + VETO_DURATION_MS).toISOString(),
  };
  await clientRepo.update(
    phone,
    { consentimientoPromociones: info } as any,
    redis
  );
  log.info({ phone }, "Consentimiento: cliente RECHAZÓ. Veto por 6 meses.");
}
