/**
 * Job: Carrito Abandonado.
 *
 * Detecta clientes que recibieron cotización (link de pago) pero NO pagaron
 * en las últimas 22-26 horas. Manda mensaje proactivo amable.
 *
 * Detección de cotización pendiente:
 *  - perfil.etapaAbandono === "cotizacion" o "checkout"
 *  - perfil.fechaAbandono entre 22h y 26h en el pasado
 *  - perfil.intentosDePago > 0 (recibió link) Y totalCompras no creció después
 *
 * Anti-spam:
 *  - Solo WhatsApp E.164
 *  - No si tiene veto marketing
 *  - No si hay otro follow-up en últimos 7 días
 *  - Solo en horario hábil 10am-7pm CDMX
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

const log = getLogger({ module: "jobs/carrito-abandonado" });

// Ventana de detección: 22h <= edad <= 26h
const MIN_HOURS_SINCE_ABANDONO = 22;
const MAX_HOURS_SINCE_ABANDONO = 26;
// Anti-spam: si ya recibió cualquier follow-up en 7 días, no mandar
const ANTI_SPAM_DAYS = 7;

export interface CarritoJobOptions {
  redis?: Redis;
  dryRun?: boolean;
}

export interface CarritoJobResult {
  total: number;
  candidatos: number;
  enviados: number;
  errores: number;
  saltados: number;
  saltadosRazon: Record<string, number>;
}

function buildMensaje(nombre: string | undefined): string {
  const saludo = nombre ? `Hola ${nombre}` : "Buen día";
  return `${saludo} 👋 quería darle seguimiento a la cotización que le pasamos ayer. ¿Le interesa proceder con el pedido o tiene alguna duda? 🐺`;
}

export async function runCarritoAbandonadoJob(
  options: CarritoJobOptions = {}
): Promise<CarritoJobResult> {
  const redis = options.redis ?? getRedis();
  const dryRun = options.dryRun ?? false;

  const result: CarritoJobResult = {
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

  // Horario hábil
  if (isQuietHour()) {
    log.info("Carrito abandonado: skip por hora silenciosa");
    return result;
  }

  const nowMs = Date.now();
  const minMs = nowMs - MAX_HOURS_SINCE_ABANDONO * 60 * 60 * 1000;
  const maxMs = nowMs - MIN_HOURS_SINCE_ABANDONO * 60 * 60 * 1000;

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

          // 1. Solo WhatsApp
          if (!/^\d{10,15}$/.test(telefono)) {
            skipReason("no_whatsapp");
            continue;
          }

          // 2. Veto marketing
          if (perfil.vetoMarketing) {
            skipReason("veto_marketing");
            continue;
          }

          // 3. Tiene etapa de abandono "cotizacion" o "checkout"
          if (!["cotizacion", "checkout"].includes(perfil.etapaAbandono)) {
            continue; // No es candidato, ni siquiera lo cuento como skip
          }

          // 4. Fecha de abandono en ventana 22-26h
          if (!perfil.fechaAbandono) {
            skipReason("sin_fecha_abandono");
            continue;
          }
          const abandonoMs = new Date(perfil.fechaAbandono).getTime();
          if (abandonoMs < minMs || abandonoMs > maxMs) continue; // fuera de ventana

          // 5. Bot pausado por agente humano
          const paused = await isBotPaused(telefono, redis);
          if (paused) {
            skipReason("bot_pausado");
            continue;
          }

          // 6. Anti-spam: otro follow-up reciente
          const yaRecibido = await hasFollowUpInLastDays(telefono, ANTI_SPAM_DAYS, redis);
          if (yaRecibido) {
            skipReason("cooldown_anti_spam");
            continue;
          }

          result.candidatos++;

          const mensaje = buildMensaje(perfil.nombre);

          if (dryRun) {
            log.info({ telefono, mensaje }, "[DRY-RUN] Habría enviado carrito abandonado");
            continue;
          }

          // 7. Enviar
          const sent = await sendText(telefono, mensaje);
          if (!sent) {
            result.errores++;
            continue;
          }

          // 8. Registrar en historial + repo
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
              tipo: "carrito_abandonado",
              mensaje,
              contexto: { etapaAbandono: perfil.etapaAbandono },
            },
            redis
          );

          await recordEvent({
            type: "reactivation_sent",
            clientId: telefono,
            channel: "whatsapp",
            data: { subtype: "carrito_abandonado" },
          });

          result.enviados++;
        } catch (err) {
          result.errores++;
          const msg = err instanceof Error ? err.message : String(err);
          log.warn({ err: msg, key }, "Error procesando cliente");
        }
      }
    } while (cursor !== "0" && cursor !== 0);

    log.info(result, "Job carrito abandonado completado");
    return result;
  } catch (err) {
    log.error({ err }, "Job carrito abandonado falló");
    throw err;
  }
}