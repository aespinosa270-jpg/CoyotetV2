/**
 * Hook que el webhook de Stripe llama cuando confirma un pago.
 * Actualiza la Order del bot v2 a PAID y manda el recibo PNG al cliente.
 *
 * INTEGRACIÓN en /api/webhook/route.ts:
 *   import { onStripePaymentSuccess } from "@/lib/bot/services/crm/stripe-hooks";
 *   // Después de actualizar la orden:
 *   await onStripePaymentSuccess(paymentIntent.id, orderId);
 */
import { prisma } from "@/lib/prisma";
import { getLogger } from "../../observability/logger";
import { updateOrderStatus } from "./order-creator";
import { sendText, sendMedia } from "../meta/send";

const log = getLogger({ module: "crm/stripe-hooks" });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.coyotetextil.com";

/**
 * Marca como PAID las órdenes del bot v2 y manda recibo al cliente.
 *
 * @param stripePaymentId - Stripe payment_intent.id O session.id
 * @param explicitOrderId - Si Stripe metadata trae order_id directo, mejor
 */
export async function onStripePaymentSuccess(
  stripePaymentId: string,
  explicitOrderId?: string
): Promise<{ ok: boolean; updated: number; receiptSent?: boolean }> {
  try {
    // Buscar órdenes pendientes: por orderId explícito O por paymentId guardado
    const whereClause = explicitOrderId
      ? { id: explicitOrderId, source: "bot_v2" as any }
      : { paymentId: stripePaymentId, status: "PENDING" as const, source: "bot_v2" as any };

    const orders = await prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        orderNumber: true,
        total: true,
        customerPhone: true,
        customerName: true,
        botPhone: true,
        status: true,
      },
    });

    if (orders.length === 0) {
      log.warn(
        { paymentId: stripePaymentId, explicitOrderId },
        "Stripe webhook: no se encontró Order del bot v2"
      );
      return { ok: true, updated: 0 };
    }

    let receiptSentCount = 0;

    for (const order of orders) {
      // 1. Marcar PAID solo si está PENDING
      if (order.status === "PENDING") {
        await updateOrderStatus(order.id, "PAID", "stripe-webhook");
      }

      log.info(
        {
          orderNumber: order.orderNumber,
          total: order.total,
          phone: order.customerPhone || order.botPhone,
        },
        "✅ Order marcada PAID por webhook Stripe"
      );

      // 2. Mandar recibo + mensaje al cliente vía WhatsApp
      const targetPhone = order.botPhone || order.customerPhone;
      if (!targetPhone) {
        log.warn({ orderId: order.id }, "No hay phone para mandar recibo");
        continue;
      }

      const receiptUrl = `${BASE_URL}/api/recibo/${order.id}`;
      const formattedTotal = order.total.toLocaleString("es-MX", {
        minimumFractionDigits: 2,
      });

      try {
        // Mensaje de confirmación primero
        const msgConfirmacion =
          `✅ ¡Pago confirmado, ${order.customerName?.split(" ")[0] || ""}!\n\n` +
          `Su orden *#${order.orderNumber.slice(-8).toUpperCase()}* por *$${formattedTotal} MXN* quedó registrada.\n\n` +
          `Le mando aquí su ticket Coyote 🐺. En las próximas horas le confirmamos los detalles de entrega.`;

        await sendText(targetPhone, msgConfirmacion);

        // Pequeña pausa para que llegue en orden
        await new Promise((r) => setTimeout(r, 400));

        // Mandar imagen del recibo
        const mediaSent = await sendMedia({
          to: targetPhone,
          mediaUrl: receiptUrl,
          mediaType: "image",
          caption: `Ticket #${order.orderNumber.slice(-8).toUpperCase()} · Coyote Textil 🐺`,
        });

        if (mediaSent) {
          receiptSentCount++;
          log.info(
            { orderNumber: order.orderNumber, targetPhone },
            "📧 Recibo PNG enviado al cliente vía WhatsApp"
          );
        } else {
          log.warn(
            { orderNumber: order.orderNumber, targetPhone },
            "Recibo NO enviado (Meta API rechazó)"
          );
        }
      } catch (err) {
        log.error(
          { err, orderId: order.id, targetPhone },
          "Excepción enviando recibo al cliente"
        );
      }
    }

    return { ok: true, updated: orders.length, receiptSent: receiptSentCount > 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg, paymentId: stripePaymentId }, "Error en stripe hook");
    return { ok: false, updated: 0 };
  }
}

/**
 * Marca como FAILED cuando Stripe reporta pago fallido.
 */
export async function onStripePaymentFailed(
  stripePaymentId: string
): Promise<{ ok: boolean; updated: number }> {
  try {
    const orders = await prisma.order.findMany({
      where: {
        paymentId: stripePaymentId,
        status: "PENDING",
        source: "bot_v2" as any,
      },
      select: { id: true, orderNumber: true, botPhone: true, customerPhone: true },
    });

    for (const order of orders) {
      await updateOrderStatus(order.id, "FAILED", "stripe-webhook");

      // Notificar al cliente que el pago falló (opcional pero buena UX)
      const targetPhone = order.botPhone || order.customerPhone;
      if (targetPhone) {
        try {
          await sendText(
            targetPhone,
            `⚠️ Su pago para la orden #${order.orderNumber.slice(-8).toUpperCase()} no se completó. ` +
              `Si desea, puedo generarle un nuevo link de pago. ¿Cómo procedemos?`
          );
        } catch (err) {
          log.warn({ err, orderId: order.id }, "No se pudo notificar pago fallido");
        }
      }
    }
    return { ok: true, updated: orders.length };
  } catch (err) {
    log.error({ err }, "Error marcando order FAILED");
    return { ok: false, updated: 0 };
  }
}