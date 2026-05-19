/**
 * Job: Recompra Predictiva.
 *
 * Para clientes con 2+ compras previas, calcula su frecuencia típica y
 * manda mensaje proactivo cuando se aproxima la fecha de recompra esperada.
 *
 * Lógica:
 *   diasDesdeUltimaCompra >= diasEntreCompras * 0.85
 *
 * Anti-spam:
 *  - Mínimo 7 días entre follow-ups del mismo cliente
 *  - Solo en horario hábil
 *  - Respeta veto marketing
 *  - Si el cliente ya tiene cotización abierta (etapaAbandono), no mandar (es otro flujo)
 */
import type { Redis } from "@upstash/redis";
import { getRedis } from "../../repositories/redis";
import { getLogger } from "../../observability/logger";
import { recordEvent } from "../../observability/events";
import { sendText } from "../meta/send";
import { appendMensaje } from "../../repositories/conversation-repo";
import { isBotPaused } from "../../repositories/pause-repo";
import { isQuietHour } from "./quiet-hours";
import {
  registerFollowUp,
  hasFollowUpInLastDays,
} from "./followup-repo";

const log = getLogger({ module: "jobs/recompra-predictiva" });

const UMBRAL_RECOMPRA = 0.85; // 85% del ciclo típico
const MIN_COMPRAS = 2;
const ANTI_SPAM_DAYS = 7;
const DIAS_MAX_INACTIVO = 60; // si ha pasado más de eso, mejor reactivación fría

export interface RecompraJobOptions {
  redis?: Redis;
  dryRun?: boolean;
}

export interface RecompraJobResult {
  total: number;
  candidatos: number;
  enviados: number;
  errores: number;
  saltados: number;
  saltadosRazon: Record<string, number>;
}

function buildMensaje(perfil: any): string {
  const nombre = perfil.nombre || "";
  const productoFavorito =
    perfil.productosFavoritos?.[0] ||
    perfil.productosComprados?.[0] ||
    "material";
  const saludo = nombre ? `Hola ${nombre}` : "Buen día";
  return `${saludo} 👋 según su historial, calculo que probablemente ya esté necesitando más ${productoFavorito}. ¿Le confirmo disponibilidad y le aparto?`;
}

export async function runRecompraPredictivaJob(
  options: RecompraJobOptions = {}
): Promise<RecompraJobResult> {
  const redis = options.redis ?? getRedis();
  const dryRun = options.dryRun ?? false;

  const result: RecompraJobResult = {
    total: 0,
    candidatos: 0,
    enviados: 0,
    errores: 0,
    saltados: 0,
    saltadosRazon: {},
  };

  function skipReason(razon: string) {
    result.saltados++;
    result.saltadosRazon[razon] = (result.saltadosRazon[razon] ?? 0) + 1;
  }

  if (isQuietHour()) {
    log.info("Recompra: skip por hora silenciosa");
    return result;
  }

  const nowMs = Date.now();
  const maxInactivoMs = DIAS_MAX_INACTIVO * 24 * 60 * 60 * 1000;

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

          if (!/^\d{10,15}$/.test(telefono)) {
            skipReason("no_whatsapp");
            continue;
          }
          if (perfil.vetoMarketing) {
            skipReason("veto_marketing");
            continue;
          }
          if ((perfil.totalCompras ?? 0) < MIN_COMPRAS) {
            continue; // no es candidato
          }

          // Necesitamos ultimaFechaCompra y diasEntreCompras
          if (!perfil.ultimaFechaCompra || !perfil.diasEntreCompras) {
            skipReason("sin_datos_recompra");
            continue;
          }

          const ultimaMs = new Date(perfil.ultimaFechaCompra).getTime();
          const diasDesde = (nowMs - ultimaMs) / (24 * 60 * 60 * 1000);

          // Si pasó demasiado, ya es lead frío, no recompra predictiva
          if (nowMs - ultimaMs > maxInactivoMs) {
            skipReason("muy_inactivo");
            continue;
          }

          const umbralDias = perfil.diasEntreCompras * UMBRAL_RECOMPRA;
          if (diasDesde < umbralDias) continue; // aún no es momento

          // Si tiene carrito abandonado, mejor no spamear con otro mensaje
          if (perfil.etapaAbandono && perfil.etapaAbandono !== null) {
            skipReason("tiene_carrito_abandonado");
            continue;
          }

          const paused = await isBotPaused(telefono, redis);
          if (paused) {
            skipReason("bot_pausado");
            continue;
          }

          const yaRecibido = await hasFollowUpInLastDays(telefono, ANTI_SPAM_DAYS, redis);
          if (yaRecibido) {
            skipReason("cooldown_anti_spam");
            continue;
          }

          result.candidatos++;

          const mensaje = buildMensaje(perfil);

          if (dryRun) {
            log.info({ telefono, mensaje }, "[DRY-RUN] Habría enviado recompra predictiva");
            continue;
          }

          const sent = await sendText(telefono, mensaje);
          if (!sent) {
            result.errores++;
            continue;
          }

          try {
            await appendMensaje(
              telefono,
              { role: "assistant", content: mensaje } as any,
              redis
            );
          } catch (err) {
            log.warn({ err, telefono }, "No se pudo registrar en historial");
          }

          await registerFollowUp(
            {
              phone: telefono,
              tipo: "recompra_predictiva",
              mensaje,
              contexto: {
                diasDesdeUltimaCompra: Math.round(diasDesde),
                diasEntreCompras: perfil.diasEntreCompras,
                totalCompras: perfil.totalCompras,
              },
            },
            redis
          );

          await recordEvent({
            type: "reactivation_sent",
            clientId: telefono,
            channel: "whatsapp",
            data: { subtype: "recompra_predictiva" },
          });

          result.enviados++;
        } catch (err) {
          result.errores++;
          const msg = err instanceof Error ? err.message : String(err);
          log.warn({ err: msg, key }, "Error procesando cliente");
        }
      }
    } while (cursor !== "0" && cursor !== 0);

    log.info(result, "Job recompra predictiva completado");
    return result;
  } catch (err) {
    log.error({ err }, "Job recompra predictiva falló");
    throw err;
  }
}