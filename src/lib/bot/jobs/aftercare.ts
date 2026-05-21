/**
 * Aftercare Job — corre en cron diario.
 *
 * Detecta orders que necesitan touchpoint post-venta:
 *   - DELIVERED hace 6-8 días → check "¿Cómo te llegó?" + suma trust
 *   - DELIVERED hace 28-32 días → mensaje re-engagement (genera AftercareEvent
 *     pending, NO envía automático — vendedora aprueba en /crm/admin/aftercare)
 *
 * NO envía mensajes solo. Crea AftercareEvent en estado "pending" para que
 * la cola de aftercare lo procese con aprobación humana.
 */
import { prisma } from "@/lib/prisma";
import { applyTrustDelta } from "../services/trust/calculator";
import { getLogger } from "../observability/logger";

const log = getLogger({ module: "jobs/aftercare" });

interface AftercareResult {
  dryRun: boolean;
  postDelivery7d: { detected: number; created: number; trustApplied: number };
  reEngagement30d: { detected: number; created: number };
  errors: string[];
}

export async function runAftercareJob({
  dryRun = false,
}: { dryRun?: boolean } = {}): Promise<AftercareResult> {
  const result: AftercareResult = {
    dryRun,
    postDelivery7d: { detected: 0, created: 0, trustApplied: 0 },
    reEngagement30d: { detected: 0, created: 0 },
    errors: [],
  };

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  // ── BLOQUE 1: Orders DELIVERED hace 6-8 días ──
  // Buscamos en ventana de 2 días para evitar perder algunos por horarios
  const sevenDaysAgoStart = new Date(now - 8 * day);
  const sevenDaysAgoEnd = new Date(now - 6 * day);

  try {
    const ordersFor7d = await prisma.order.findMany({
      where: {
        status: "DELIVERED",
        deliveredAt: {
          gte: sevenDaysAgoStart,
          lte: sevenDaysAgoEnd,
        },
        userId: { not: null },
        // Evitar duplicar si ya existe AftercareEvent post_delivery_7d
        aftercareEvents: {
          none: { type: "post_delivery_7d" },
        },
      },
      select: {
        id: true,
        userId: true,
        orderNumber: true,
        total: true,
        customerName: true,
        customerPhone: true,
        deliveredAt: true,
      },
    });

    result.postDelivery7d.detected = ordersFor7d.length;
    log.info({ detected: ordersFor7d.length }, "Orders detectadas para aftercare D+7");

    for (const order of ordersFor7d) {
      if (!order.userId) continue;

      try {
        if (!dryRun) {
          // Crear evento pending (espera approval humano en UI)
          await prisma.aftercareEvent.create({
            data: {
              userId: order.userId,
              orderId: order.id,
              type: "post_delivery_7d",
              channel: "whatsapp",
              outcome: "pending",
              trustDelta: 0, // Se aplica cuando responda positivo
              notas: `Pedido ${order.orderNumber} entregado hace 7 dias. Esperando aprobacion para enviar check post-entrega.`,
            },
          });

          // Trust delta automatico por entrega exitosa
          await applyTrustDelta({
            userId: order.userId,
            eventType: "order_delivered_on_time",
            orderId: order.id,
            notas: `Auto: entrega cumplida ${order.orderNumber}`,
          });
          result.postDelivery7d.trustApplied++;
        }
        result.postDelivery7d.created++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.warn({ orderId: order.id, err: msg }, "Fallo crear AftercareEvent D+7");
        result.errors.push(`D+7 ${order.orderNumber}: ${msg}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg }, "Fallo bloque D+7");
    result.errors.push(`D+7 query: ${msg}`);
  }

  // ── BLOQUE 2: Orders DELIVERED hace 28-32 días → re-engagement ──
  const thirtyDaysAgoStart = new Date(now - 32 * day);
  const thirtyDaysAgoEnd = new Date(now - 28 * day);

  try {
    const ordersFor30d = await prisma.order.findMany({
      where: {
        status: "DELIVERED",
        deliveredAt: {
          gte: thirtyDaysAgoStart,
          lte: thirtyDaysAgoEnd,
        },
        userId: { not: null },
        aftercareEvents: {
          none: { type: "re_engagement_30d" },
        },
      },
      select: {
        id: true,
        userId: true,
        orderNumber: true,
        total: true,
        customerName: true,
        customerPhone: true,
        deliveredAt: true,
      },
    });

    result.reEngagement30d.detected = ordersFor30d.length;
    log.info({ detected: ordersFor30d.length }, "Orders detectadas para re-engagement D+30");

    for (const order of ordersFor30d) {
      if (!order.userId) continue;

      try {
        if (!dryRun) {
          await prisma.aftercareEvent.create({
            data: {
              userId: order.userId,
              orderId: order.id,
              type: "re_engagement_30d",
              channel: "whatsapp",
              outcome: "pending",
              trustDelta: 0,
              notas: `30 dias desde ${order.orderNumber}. Listo para re-engagement con IA (cola aftercare).`,
            },
          });
        }
        result.reEngagement30d.created++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.warn({ orderId: order.id, err: msg }, "Fallo crear AftercareEvent D+30");
        result.errors.push(`D+30 ${order.orderNumber}: ${msg}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg }, "Fallo bloque D+30");
    result.errors.push(`D+30 query: ${msg}`);
  }

  log.info({ result }, "Aftercare job completado");
  return result;
}