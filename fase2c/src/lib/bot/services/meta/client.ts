/**
 * services/meta/client.ts
 *
 * Helpers base para la WhatsApp Cloud API (Meta Graph API).
 * - URL builder
 * - Headers de autenticación
 * - Normalización de teléfonos mexicanos (521XXXXXXXXX → 52XXXXXXXXX)
 */

import { getEnv } from "../../config/env";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "meta/client" });

// ─── Constantes ────────────────────────────────────────────────────────────────

export const GRAPH_API_BASE = "https://graph.facebook.com";

/**
 * Construye la URL base para un endpoint de la Graph API.
 * Usa la versión configurada en META_GRAPH_API_VERSION (default v22.0).
 */
export function graphUrl(path: string): string {
  const env = getEnv();
  const version = env.META_GRAPH_API_VERSION ?? "v22.0";
  // Evitar doble slash
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${GRAPH_API_BASE}/${version}${cleanPath}`;
}

/**
 * Headers estándar para llamadas autenticadas a Graph API.
 */
export function authHeaders(): Record<string, string> {
  const env = getEnv();
  return {
    Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
    "Content-Type": "application/json",
  };
}

/**
 * URL del endpoint de mensajes para el número de teléfono configurado.
 */
export function messagesUrl(): string {
  const env = getEnv();
  return graphUrl(`/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`);
}

/**
 * URL para obtener info de un media object de Meta.
 */
export function mediaInfoUrl(mediaId: string): string {
  return graphUrl(`/${mediaId}`);
}

// ─── Normalización de teléfonos ────────────────────────────────────────────────

/**
 * Peculiaridad de la API de WhatsApp para números mexicanos:
 * Los celulares llegan como 521XXXXXXXXX (13 dígitos) pero la API
 * solo los acepta como 52XXXXXXXXX (12 dígitos) para envío.
 *
 * Esta función normaliza cualquier número de teléfono que recibamos.
 */
export function normalizeMxPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  // Caso: 521XXXXXXXXX (13 dígitos, celular MX con dígito extra)
  if (digits.startsWith("521") && digits.length === 13) {
    const normalized = `52${digits.slice(3)}`;
    log.debug({ original: phone, normalized }, "Teléfono MX normalizado 521→52");
    return normalized;
  }

  return digits;
}

/**
 * Valida que un número de teléfono tenga formato E.164 básico.
 * No hace lookup, solo verifica estructura.
 */
export function isValidE164(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}
