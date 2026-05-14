/**
 * Job de reactivación V2 (Fase 11C).
 *
 * EVOLUCIÓN:
 *  - V1 (Fase 10A): solo marcaba clientes como "inactivo" en perfil
 *  - V2 (Fase 11C): además ENVÍA la plantilla `bienvenida` por WhatsApp
 *
 * Criterios conservadores (anti-fatiga):
 *  - Default: clientes >30 días sin contacto
 *  - Solo si tienen 1+ compras previas (no prospectos fríos)
 *  - Si ya recibieron reactivación reciente, no re-enviar (cooldown 15 días)
 *  - Si su consentimiento promociones está "rechazado", no enviar
 *
 * SOLO se envía a clientes de WhatsApp (no web/telegram/instagram). Para
 * web no hay forma de "iniciar conversación" sin que ellos estén en el sitio.
 */
import type { Redis } from "@upstash/redis";
import { getRedis } from "../repositories/redis";
import { getLogger } from "../observability/logger";
import { recordEvent } from "../observability/events";
import { sendTemplate, TEMPLATES } from "../services/meta/template";
import { getConsentInfo } from "../repositories/consent-repo";

const log = getLogger({ module: "jobs/reactivation" });

const DEFAULT_DIAS_INACTIVIDAD = 30;
/** Cooldown entre reactivaciones del mismo cliente. */
const REACTIVATION_COOLDOWN_DAYS = 15;

export interface ReactivationJobOptions {
  redis?: Redis;
  diasInactividad?: number;
  /** Si true, no manda mensajes reales — solo simula. */
  dryRun?: boolean;
  /** Override del envío real (para tests). */
  sendTemplateImpl?: typeof sendTemplate;
}

export interface ReactivationJobResult {
  total: number;
  candidatos: number;
  enviados: number;
  errores: number;
  saltados: number;
  detalles: Array<{
    clientId: string;
    accion:
      | "enviado"
      | "skipped_cooldown"
      | "skipped_consent_rechazado"
      | "skipped_no_whatsapp"
      | "skipped_sin_compras"
      | "skipped_ya_inactivo"
      | "error";
    error?: string;
  }>;
}

export async function runReactivationJob(
  options: ReactivationJobOptions = {}
): Promise<ReactivationJobResult> {
  const redis = options.redis ?? getRedis();
  const dias = options.diasInactividad ?? DEFAULT_DIAS_INACTIVIDAD;
  const dryRun = options.dryRun ?? false;
  const sendImpl = options.sendTemplateImpl ?? sendTemplate;

  const cutoffMs = Date.now() - dias * 24 * 60 * 60 * 1000;
  const cooldownMs = REACTIVATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

  const result: ReactivationJobResult = {
    total: 0,
    candidatos: 0,
    enviados: 0,
    errores: 0,
    saltados: 0,
    detalles: [],
  };

  try {
    let cursor: string | number = 0;
    do {
      const scanResult = (await redis.scan(cursor as any, {
        match: "v2:cliente:*",
        count: 100,
      })) as [string | number, string[]];
      cursor = scanResult[0];
      const keys = scanResult[1];

      for (const key of keys) {
        try {
          const perfil = await redis.get<any>(key);
          if (!perfil) continue;

          result.total++;
          const telefono = perfil.telefono ?? key.replace("v2:cliente:", "");

          // 1. Solo WhatsApp (telefónos E.164, no web/tg/ig)
          if (!/^\d{10,15}$/.test(telefono)) {
            result.saltados++;
            result.detalles.push({
              clientId: telefono,
              accion: "skipped_no_whatsapp",
            });
            continue;
          }

          // 2. Verificar inactividad >30 días
          const ultimoMs = perfil.ultimoContacto
            ? new Date(perfil.ultimoContacto).getTime()
            : 0;
          if (ultimoMs >= cutoffMs) continue; // Activo, skip

          // 3. Verificar que tenga compras previas
          if ((perfil.totalCompras ?? 0) === 0) {
            result.saltados++;
            result.detalles.push({
              clientId: telefono,
              accion: "skipped_sin_compras",
            });
            continue;
          }

          // 4. Verificar consentimiento NO rechazado
          const consent = getConsentInfo(perfil);
          if (consent.estado === "rechazado") {
            result.saltados++;
            result.detalles.push({
              clientId: telefono,
              accion: "skipped_consent_rechazado",
            });
            continue;
          }

          // 5. Cooldown si ya se reactivó recientemente
          const ultimaReactivacion = perfil.ultimaReactivacion
            ? new Date(perfil.ultimaReactivacion).getTime()
            : 0;
          if (
            ultimaReactivacion > 0 &&
            Date.now() - ultimaReactivacion < cooldownMs
          ) {
            result.saltados++;
            result.detalles.push({
              clientId: telefono,
              accion: "skipped_cooldown",
            });
            continue;
          }

          result.candidatos++;

          if (dryRun) {
            // En dry-run, solo logueamos qué haríamos
            log.info(
              { telefono, totalCompras: perfil.totalCompras },
              "[DRY-RUN] Habría enviado plantilla bienvenida"
            );
            result.detalles.push({
              clientId: telefono,
              accion: "enviado",
            });
            continue;
          }

          // 6. ENVIAR plantilla real
          const sendResult = await sendImpl({
            to: telefono,
            templateName: TEMPLATES.BIENVENIDA.name,
            language: TEMPLATES.BIENVENIDA.language,
          });

          if (sendResult.ok) {
            // Actualizar perfil: marcar inactivo + ultima reactivación
            const actualizado = {
              ...perfil,
              segmento: "inactivo",
              ultimaReactivacion: new Date().toISOString(),
              fechaMarcadoInactivo:
                perfil.fechaMarcadoInactivo ?? new Date().toISOString(),
            };
            await redis.set(key, actualizado);

            await recordEvent({
              type: "reactivation_sent",
              clientId: telefono,
              channel: "whatsapp",
              data: {
                template: TEMPLATES.BIENVENIDA.name,
                messageId: sendResult.messageId,
                diasInactivo: Math.floor(
                  (Date.now() - ultimoMs) / (24 * 60 * 60 * 1000)
                ),
              },
            });

            result.enviados++;
            result.detalles.push({
              clientId: telefono,
              accion: "enviado",
            });
          } else {
            result.errores++;
            result.detalles.push({
              clientId: telefono,
              accion: "error",
              error: sendResult.error,
            });
            log.warn(
              { telefono, error: sendResult.error, code: sendResult.errorCode },
              "Falló envío de reactivación"
            );
          }
        } catch (err) {
          result.errores++;
          const msg = err instanceof Error ? err.message : String(err);
          log.warn({ err: msg, key }, "Error procesando un cliente");
        }
      }
    } while (cursor !== "0" && cursor !== 0);

    log.info(result, "Job de reactivación V2 completado");
    return result;
  } catch (err) {
    log.error({ err }, "Job de reactivación V2 falló");
    throw err;
  }
}
