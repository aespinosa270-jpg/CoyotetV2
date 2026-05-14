/**
 * Hook que el webhook de Stripe llama cuando confirma un pago.
 * Actualiza la Order del bot v2 a PAID.
 *
 * INTEGRACIÓN: En tu webhook de Stripe existente (probablemente
 * /api/webhook/route.ts), agrega al final del handler de
 * `checkout.session.completed`:
 *
 *   import { onStripePaymentSuccess } from "@/lib/bot/services/crm/stripe-hooks";
 *   await onStripePaymentSuccess(session.id);
 */
import { prisma } from "@/lib/prisma";
import { getLogger } from "../../observability/logger";
import { updateOrderStatus } from "./order-creator";

const log = getLogger({ module: "crm/stripe-hooks" });

/**
 * Marca como PAID cualquier orden del bot que tenga el session_id de Stripe.
 */
export async function onStripePaymentSuccess(
  stripeSessionId: string
): Promise<{ ok: boolean; updated: number }> {
  try {
    // Buscar órdenes pendientes con este paymentId
    const orders = await prisma.order.findMany({
      where: {
        paymentId: stripeSessionId,
        status: "PENDING",
        source: "bot_v2" as any,
      },
      select: { id: true, orderNumber: true, total: true, customerPhone: true },
    });

    if (orders.length === 0) {
      log.warn(
        { sessionId: stripeSessionId },
        "Stripe webhook: no se encontró Order pendiente con ese sessionId"
      );
      return { ok: true, updated: 0 };
    }

    for (const order of orders) {
      await updateOrderStatus(order.id, "PAID", "stripe-webhook");
      log.info(
        {
          orderNumber: order.orderNumber,
          total: order.total,
          phone: order.customerPhone,
        },
        "✅ Order marcada PAID por webhook Stripe"
      );
    }

    return { ok: true, updated: orders.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg, sessionId: stripeSessionId }, "Error en stripe hook");
    return { ok: false, updated: 0 };
  }
}

/**
 * Marca como FAILED cuando Stripe reporta pago fallido.
 */
export async function onStripePaymentFailed(
  stripeSessionId: string
): Promise<{ ok: boolean; updated: number }> {
  try {
    const orders = await prisma.order.findMany({
      where: {
        paymentId: stripeSessionId,
        status: "PENDING",
        source: "bot_v2" as any,
      },
      select: { id: true },
    });

    for (const order of orders) {
      await updateOrderStatus(order.id, "FAILED", "stripe-webhook");
    }

    return { ok: true, updated: orders.length };
  } catch (err) {
    log.error({ err }, "Error marcando order FAILED");
    return { ok: false, updated: 0 };
  }
}
