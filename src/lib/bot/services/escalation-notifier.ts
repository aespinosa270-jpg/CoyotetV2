/**
 * Servicio orquestador de escalación:
 *  1. Crea registro en Prisma
 *  2. Envía mensaje al cliente
 *  3. Pausa el bot (Feature 3) por 23h
 *  4. Notifica al admin vía WhatsApp
 *
 * Todo en un solo punto para que el orchestrator solo llame triggerEscalation().
 */
import { sendText } from "./meta/send";
import {
  buildEscalationClientMessage,
  buildAdminNotification,
} from "../domain/escalation/messages";
import { RAZON_LABELS, type RazonEscalacion } from "../domain/escalation/types";
import { createEscalation } from "../repositories/escalation-repo";
import { pauseBot } from "../repositories/pause-repo";
import { appendMensaje } from "../repositories/conversation-repo";
import { getLogger } from "../observability/logger";
import { getRedis } from "../repositories/redis";

const log = getLogger({ module: "escalation-notifier" });

const ADMIN_PHONE = "5215627301525"; // Jack
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.coyotetextil.com";

export interface TriggerEscalationInput {
  phone: string;
  nombre?: string;
  razon: RazonEscalacion;
  contexto: string;
  ultimoMsg: string;
}

export interface TriggerEscalationResult {
  ok: boolean;
  escalationId?: string;
  alreadyEscalated?: boolean;
  clientMessage?: string;
}

/**
 * Dispara una escalación completa.
 *
 * Si ya existía escalación pendiente reciente (<30 min), NO duplica ni
 * vuelve a mandar mensaje al cliente. Retorna { alreadyEscalated: true }.
 */
export async function triggerEscalation(
  input: TriggerEscalationInput
): Promise<TriggerEscalationResult> {
  log.info({ phone: input.phone, razon: input.razon }, "Disparando escalación");

  // 1. Crear registro en Prisma
  const created = await createEscalation({
    phone: input.phone,
    nombre: input.nombre,
    razon: input.razon,
    contexto: input.contexto,
    ultimoMsg: input.ultimoMsg,
  });

  if (!created) {
    log.error({ phone: input.phone }, "Falló creación de escalación");
    return { ok: false };
  }

  // Si ya estaba escalado, NO duplicar acciones
  // (createEscalation devolvió la existente)
  const isNew =
    created.createdAt.getTime() > Date.now() - 5000; // creado en últimos 5 seg

  if (!isNew) {
    return {
      ok: true,
      escalationId: created.id,
      alreadyEscalated: true,
    };
  }

  // 2. Pausar el bot por 23h
  try {
    await pauseBot(input.phone, "auto-escalation");
  } catch (err) {
    log.warn({ err, phone: input.phone }, "No se pudo pausar bot");
  }

  // 3. Mensaje al cliente
  const clientMsg = buildEscalationClientMessage(input.razon);
  try {
    await sendText(input.phone, clientMsg);
    await appendMensaje(input.phone, {
      role: "assistant",
      content: clientMsg,
      timestamp: new Date().toISOString(),
    } as any);
  } catch (err) {
    log.warn({ err, phone: input.phone }, "No se pudo enviar mensaje al cliente");
  }

  // 4. Notificación WhatsApp al admin
  const adminMsg = buildAdminNotification({
    phone: input.phone,
    nombre: input.nombre,
    razon: input.razon,
    razonLabel: RAZON_LABELS[input.razon],
    contexto: input.contexto,
    ultimoMsg: input.ultimoMsg,
    baseUrl: BASE_URL,
  });

  // Throttle: máximo 1 push al admin cada 5 min por mismo cliente
  // (evita spam si cliente escala varias veces seguidas)
  try {
    const redis = getRedis();
    const throttleKey = `v2:admin_push_throttle:${input.phone}`;
    const recent = await redis.get<string>(throttleKey);

    if (recent) {
      log.info(
        { phone: input.phone, razon: input.razon },
        "⏸️ Push admin omitido — throttle activo (último push hace <5 min)"
      );
    } else {
      const sent = await sendText(ADMIN_PHONE, adminMsg);
      if (!sent) {
        log.warn({ admin: ADMIN_PHONE }, "Notificación admin no entregada");
      } else {
        // Marcar throttle: 5 min TTL
        await redis.set(throttleKey, new Date().toISOString(), { ex: 300 });
        log.info(
          { phone: input.phone, razon: input.razon },
          "✅ Notificación push enviada al admin"
        );
      }
    }
  } catch (err) {
    log.error({ err, admin: ADMIN_PHONE }, "Error notificando admin");
  }

  return {
    ok: true,
    escalationId: created.id,
    alreadyEscalated: false,
    clientMessage: clientMsg,
  };
}
