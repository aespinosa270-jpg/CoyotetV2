/**
 * Servicio que crea órdenes del bot en el CRM (modelo Order de Prisma).
 *
 * Llamado automáticamente desde el tool executor cuando el bot genera
 * un cobro Stripe o SPEI exitoso.
 *
 * FLUJO:
 *  1. Bot llama generar_cobro_stripe → Stripe devuelve session
 *  2. Tool handler llama createOrderFromBot() ← aquí
 *  3. Se crea Order(status=PENDING, source=bot_v2, paymentId=session_id)
 *  4. Cliente paga
 *  5. Stripe webhook actualiza Order(status=PAID)
 *  6. Aparece en /crm/admin/bot/ordenes con botón "Marcar preparada"
 *  7. Logística despacha y va cambiando status
 */
import { prisma } from "@/lib/prisma";
import { getLogger } from "../../observability/logger";
import { recordEvent } from "../../observability/events";
import { evaluateSourcing, calcularKilosTotales } from "../sourcing/evaluator";
import { convertReferral, generateReferralCode } from "../referrals/service";
import { REFERRALS_CONFIG } from "../referrals/config";

const log = getLogger({ module: "crm/order-creator" });

export interface CreateOrderFromBotInput {
  // Identidad del cliente
  clientePhone: string;
  clienteNombre?: string;
  clienteEmail?: string;

  // Items del pedido
  items: Array<{
    title: string;
    sku?: string;
    productId?: string;
    quantity: number;
    price: number;
    unit?: string;
    color?: string;
  }>;

  // Totales
  subtotal: number;
  freightCost: number;
  shippingCost?: number;
  taxIVA?: number;
  total: number;

  // Pago
  paymentMethod: "card" | "oxxo" | "spei";
  paymentId?: string;

  // Facturación
  wantsInvoice?: boolean;

  // Envío
  address?: string;
  deliveryLat?: number;
  deliveryLng?: number;

  // Tracking interno
  botConversationId?: string;
}

export interface CreateOrderFromBotResult {
  ok: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}

/**
 * Crea una orden en el CRM y la deja en estado PENDING.
 * El webhook de Stripe la marcará como PAID cuando se complete el pago.
 */
export async function createOrderFromBot(
  input: CreateOrderFromBotInput
): Promise<CreateOrderFromBotResult> {
  try {
    // 1. Buscar/crear usuario por phone
    let userId: string | undefined;
    if (input.clientePhone) {
      const existing = await prisma.user.findFirst({
        where: { phone: input.clientePhone },
        select: { id: true },
      });
      if (existing) {
        userId = existing.id;
      } else {
        // Crear usuario "fantasma" — el cliente puede reclamar su cuenta después
        const created = await prisma.user.create({
          data: {
            phone: input.clientePhone,
            email: input.clienteEmail ?? `bot-${input.clientePhone}@coyote.tmp`,
            password: "BOT_GENERATED_NO_LOGIN", // no se usa para login
            name: input.clienteNombre,
            notes: "Creado automáticamente por bot v2",
          },
          select: { id: true },
        });
        userId = created.id;
        log.info(
          { phone: input.clientePhone, userId },
          "Usuario fantasma creado por bot"
        );
      }
    }
    // 2. Evaluar sourcing operativo (¿requiere cola por >1tn?)
    const totalKg = calcularKilosTotales(input.items);
    const sourcing = evaluateSourcing(totalKg);
    if (sourcing.requiresSourcing) {
      log.info(
        { totalKg, phone: input.clientePhone, status: sourcing.sourcingStatus },
        "Order requiere sourcing operativo (>1tn) - entra a cola"
      );
    }

    // 3. Crear la Order + items en una sola transaccion
    const order = await prisma.order.create({
      data: {
        userId,
        status: "PENDING",
        subtotal: input.subtotal,
        freightCost: input.freightCost,
        shippingCost: input.shippingCost ?? input.freightCost,
        taxIVA: input.taxIVA ?? 0,
        total: input.total,
        paymentMethod: input.paymentMethod === "spei" ? "transfer" : input.paymentMethod,
        paymentId: input.paymentId,
        customerName: input.clienteNombre ?? "Cliente bot",
        customerEmail: input.clienteEmail ?? `bot-${input.clientePhone}@coyote.tmp`,
        customerPhone: input.clientePhone,
        address: input.address,
        deliveryLat: input.deliveryLat,
        deliveryLng: input.deliveryLng,
        wantsInvoice: input.wantsInvoice ?? false,
        // Campos Fase 12
        source: "bot_v2" as any,
        botPhone: input.clientePhone,
        botConversationId: input.botConversationId,
        // Sourcing operativo (Fase 1.6) - oculto al cliente
        requiresSourcing: sourcing.requiresSourcing,
        sourcingStatus: sourcing.sourcingStatus,
        sourcingDays: sourcing.sourcingDays,
        sourcingPromisedAt: sourcing.requiresSourcing ? new Date() : null,
        items: {
          create: input.items.map((item) => ({
            title: item.title,
            sku: item.sku,
            productId: item.productId,
            price: item.price,
            quantity: item.quantity,
            unit: item.unit,
            color: item.color,
          })),
        },
      },
      select: {
        id: true,
        orderNumber: true,
      },
    });

    log.info(
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        phone: input.clientePhone,
        total: input.total,
      },
      "✅ Orden creada en CRM"
    );

    // 3. Registrar evento de observabilidad
    await recordEvent({
      type: "conversion",
      clientId: input.clientePhone,
      channel: "whatsapp",
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: input.total,
        paymentMethod: input.paymentMethod,
      },
    });

    // 4. Crear Interaction para que aparezca en CRM como evento
    if (userId) {
      try {
        await prisma.interaction.create({
          data: {
            userId,
            type: "WHATSAPP",
            summary: `Orden generada por bot — ${order.orderNumber} ($${input.total.toLocaleString("es-MX")})`,
            content: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              total: input.total,
              paymentMethod: input.paymentMethod,
              source: "bot_v2",
            } as any,
            status: "open",
          },
        });
      } catch (err) {
        log.warn({ err }, "No se pudo crear Interaction (no crítico)");
      }
    }

    return {
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg, input }, "❌ Falló creación de orden");
    return { ok: false, error: msg };
  }
}

/**
 * Actualiza el status de una orden — usado por el webhook de Stripe
 * cuando confirma pago, y desde los botones de logística en el CRM.
 */
export async function updateOrderStatus(
  orderId: string,
  status: "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "FAILED",
  updatedBy?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const updates: any = { status };
    const now = new Date();

    if (status === "PROCESSING") {
      updates.preparedAt = now;
      updates.preparedBy = updatedBy;
    } else if (status === "SHIPPED") {
      updates.shippedAt = now;
      updates.shippedBy = updatedBy;
    } else if (status === "DELIVERED") {
      updates.deliveredAt = now;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: updates,
    });

    // ── PROGRAMA DE REFERIDOS ──
    if (status === "PAID") {
      try {
        const orderForReferral = await prisma.order.findUnique({
          where: { id: orderId },
          select: {
            id: true,
            total: true,
            customerPhone: true,
            userId: true,
            referralId: true,
            user: { select: { referralCode: true } },
          },
        });

        if (orderForReferral) {
          // 1. Convertir referral pending si aplica
          if (
            !orderForReferral.referralId &&
            orderForReferral.customerPhone &&
            orderForReferral.total >= REFERRALS_CONFIG.minOrderAmount
          ) {
            const convResult = await convertReferral({
              orderId: orderForReferral.id,
              orderTotal: orderForReferral.total,
              refereePhone: orderForReferral.customerPhone,
              refereeUserId: orderForReferral.userId ?? undefined,
            });
            if (convResult.ok) {
              log.info(
                {
                  orderId,
                  referrerName: convResult.referrer.name,
                  reward: convResult.referral.creditEarned,
                },
                "Referral convertido + credito al referrer"
              );
            }
          }

          // 2. Auto-generar referralCode para el user (asi puede compartir su codigo)
          if (orderForReferral.userId && !orderForReferral.user?.referralCode) {
            try {
              const code = await generateReferralCode(orderForReferral.userId);
              log.info({ userId: orderForReferral.userId, code }, "ReferralCode auto-generado");
            } catch (err) {
              log.warn({ err, userId: orderForReferral.userId }, "Falla auto-gen referralCode");
            }
          }
        }
      } catch (err) {
        log.warn({ err, orderId }, "Programa de referidos: error procesando PAID");
      }
    }

    log.info({ orderId, status, updatedBy }, "Order status actualizado");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg, orderId, status }, "Falló actualización de status");
    return { ok: false, error: msg };
  }
}
