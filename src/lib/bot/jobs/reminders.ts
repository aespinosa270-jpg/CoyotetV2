/**
 * Job de recordatorios V2 (Fase 11C).
 *
 * DECISIÓN: Opción 1 (manual). Para recordatorios de PAGO PENDIENTE, NO
 * mandamos la plantilla `bienvenida` porque su mensaje genérico no encaja
 * con "tienes un pago pendiente". En su lugar:
 *
 *  - Marcamos al cliente con flag `pedidoPendienteFlag: true` en perfil
 *  - El admin ve la lista en /crm/admin/bot/pendientes
 *  - El equipo humano hace seguimiento personalizado
 *  - Cuando el cliente responde, el bot v2 retoma con su contexto
 *
 * Si en el futuro tienes plantilla específica como `recordatorio_pago_pendiente`,
 * conectamos sendTemplate aquí en 10 líneas.
 *
 * Cambios vs V1:
 *  - Quita el TODO de "envío real" — explícitamente NO mandamos plantilla
 *  - Marca flag visible para el admin
 *  - Sigue respetando cooldown 24h
 */
import type { Redis } from "@upstash/redis";
import { getRedis } from "../repositories/redis";
import { getLogger } from "../observability/logger";
import { recordEvent } from "../observability/events";

const log = getLogger({ module: "jobs/reminders" });

const COOLDOWN_KEY_PREFIX = "v2:reminder:cooldown:";
const COOLDOWN_TTL_SECONDS = 24 * 60 * 60;
const PENDIENTE_HORAS_MIN = 24;

export interface RemindersJobOptions {
  redis?: Redis;
  horasPendienteMin?: number;
  dryRun?: boolean;
}

export interface RemindersJobResult {
  candidatos: number;
  marcados: number;
  saltados: number;
  errores: number;
  detalles: Array<{
    clientId: string;
    accion: "marcado" | "skipped_cooldown" | "error";
    error?: string;
  }>;
}

export async function runRemindersJob(
  options: RemindersJobOptions = {}
): Promise<RemindersJobResult> {
  const redis = options.redis ?? getRedis();
  const horasMin = options.horasPendienteMin ?? PENDIENTE_HORAS_MIN;
  const dryRun = options.dryRun ?? false;

  const result: RemindersJobResult = {
    candidatos: 0,
    marcados: 0,
    saltados: 0,
    errores: 0,
    detalles: [],
  };

  try {
    const clientes = await scanClientesConPedidoPendiente(redis, horasMin);
    result.candidatos = clientes.length;

    log.info(
      { count: clientes.length, dryRun },
      "Candidatos con pedido pendiente identificados"
    );

    for (const cliente of clientes) {
      try {
        // Cooldown: si ya se marcó en últimas 24h, skip
        const cooldownKey = `${COOLDOWN_KEY_PREFIX}${cliente.telefono}`;
        const enCooldown = await redis.get(cooldownKey);
        if (enCooldown) {
          result.saltados++;
          result.detalles.push({
            clientId: cliente.telefono,
            accion: "skipped_cooldown",
          });
          continue;
        }

        if (!dryRun) {
          // Marcar flag en el perfil
          const key = `v2:cliente:${cliente.telefono}`;
          const perfil = await redis.get<any>(key);
          if (perfil) {
            await redis.set(key, {
              ...perfil,
              pedidoPendienteFlag: true,
              pedidoPendienteFlagDesde: new Date().toISOString(),
              pedidoPendienteMonto: cliente.ultimoPedido.monto,
            });
          }

          // Setear cooldown
          await redis.set(cooldownKey, "1", { ex: COOLDOWN_TTL_SECONDS });

          // Registrar evento
          await recordEvent({
            type: "reminder_sent", // semánticamente: "reminder marked for human follow-up"
            clientId: cliente.telefono,
            channel: "whatsapp",
            data: {
              modo: "marcado_para_review_humano",
              monto: cliente.ultimoPedido.monto,
            },
          });
        }

        result.marcados++;
        result.detalles.push({
          clientId: cliente.telefono,
          accion: "marcado",
        });
      } catch (err) {
        result.errores++;
        const msg = err instanceof Error ? err.message : String(err);
        result.detalles.push({
          clientId: cliente.telefono,
          accion: "error",
          error: msg,
        });
        log.warn({ err: msg, clientId: cliente.telefono }, "Error en recordatorio");
      }
    }

    log.info(result, "Job de recordatorios completado (modo manual)");
    return result;
  } catch (err) {
    log.error({ err }, "Job de recordatorios falló");
    throw err;
  }
}

// ── Helpers ────────────────────────────────────────────────────────

interface ClienteCandidato {
  telefono: string;
  nombre?: string;
  ultimoPedido: {
    monto?: number;
    timestamp: string;
    metodo?: string;
  };
}

async function scanClientesConPedidoPendiente(
  redis: Redis,
  horasMin: number
): Promise<ClienteCandidato[]> {
  const candidatos: ClienteCandidato[] = [];
  const cutoffMs = Date.now() - horasMin * 60 * 60 * 1000;

  let cursor: string | number = 0;
  do {
    const result = (await redis.scan(cursor as any, {
      match: "v2:cliente:*",
      count: 100,
    })) as [string | number, string[]];
    cursor = result[0];
    const keys = result[1];

    for (const key of keys) {
      try {
        const perfil = await redis.get<any>(key);
        if (!perfil) continue;
        const telefono = perfil.telefono ?? key.replace("v2:cliente:", "");

        const pedidos =
          (await redis.get<any[]>(`v2:pedidos:${telefono}`)) ?? [];
        const pendiente = pedidos.find(
          (p: any) =>
            (p.status === "pendiente_pago" ||
              p.estado === "pendiente_pago" ||
              p.estado === "pendiente") &&
            p.timestamp &&
            new Date(p.timestamp).getTime() < cutoffMs
        );

        if (pendiente) {
          candidatos.push({
            telefono,
            nombre: perfil.nombre,
            ultimoPedido: {
              monto: pendiente.total ?? pendiente.monto,
              timestamp: pendiente.timestamp,
              metodo: pendiente.metodo,
            },
          });
        }
      } catch (err) {
        log.warn({ err, key }, "Error procesando cliente en scan");
      }
    }
  } while (cursor !== "0" && cursor !== 0);

  return candidatos;
}
