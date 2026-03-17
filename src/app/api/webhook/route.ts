// src/app/api/checkout/webhook/route.ts
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { sendAdminOrderNotification } from "@/lib/mailer" // 🔥 Tu misil de ZeptoMail
import { timbrarFacturaReal } from "@/lib/facturapi"      // 🧾 Tu misil del SAT (CFDI 4.0)

// 🐺 Inicializamos Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
})

const webhookSecret = process.env.STRIPE_CHECKOUT_WEBHOOK_SECRET!

export async function POST(req: Request) {
  const body = await req.text()
  const reqHeaders = await headers()
  const signature = reqHeaders.get("Stripe-Signature") as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error: any) {
    console.error("🔥 Error de firma en el Webhook de Tienda:", error.message)
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 })
  }

  // ─── MANEJO DE EVENTOS DEL CARRITO DE COMPRAS ──────────────────────────────
  switch (event.type) {

    // 1. EL CLIENTE PAGÓ SU CARRITO CON ÉXITO
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const orderId = paymentIntent.metadata.order_id

      if (orderId) {
        // 🔥 Actualizamos a "PAID" e incluimos los "items" y al "user" de tu Prisma
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "PAID", 
            paymentId: paymentIntent.id, // Guardamos el ID de pago de Stripe por si hay devoluciones
          },
          include: {
            items: true, 
            user: true, // <- VITAL para saber su nivel de membresía y darle sus puntos
          }
        })
        
        console.log(`✅ Pago exitoso. Orden ${updatedOrder.orderNumber} marcada como PAGADA.`)

        // =====================================================================
        // 💰 INYECCIÓN: SISTEMA DE PUNTOS COYOTE
        // =====================================================================
        try {
          // Extraemos los puntos que usó (viene de la metadata que mandaste al crear el checkout)
          const puntosUsados = parseInt(paymentIntent.metadata.puntos_usados || '0');
          
          // Calculamos los que ganó según su nivel B2B
          const tier = updatedOrder.user.membershipTier || 'NONE';
          let multiplicador = 0.5; // Silver
          if (tier === 'GOLD') multiplicador = 1.0;
          if (tier === 'BLACK') multiplicador = 2.0;
          if (tier === 'ELITE') multiplicador = 4.0;
          
          // Gana puntos basados en el subtotal
          const puntosGanados = Math.floor((updatedOrder.subtotal / 100) * multiplicador);
          const balanceNeto = puntosGanados - puntosUsados;

          if (balanceNeto !== 0) {
            await prisma.user.update({
              where: { id: updatedOrder.userId },
              data: { points: { increment: balanceNeto } }
            });
            console.log(`🐺 Puntos actualizados para el socio: ${balanceNeto > 0 ? '+' : ''}${balanceNeto}`);
          }
        } catch (pointsErr) {
          console.error("⚠️ Error actualizando puntos (no detiene la orden):", pointsErr);
        }

        // =====================================================================
        // 🧾 INYECCIÓN FACTURAPI (SAT CFDI 4.0)
        // =====================================================================
        const reqInvoice = paymentIntent.metadata.req_invoice === 'YES';

        if (reqInvoice) {
          try {
            console.log("⏳ Iniciando timbrado automático ante el SAT...");
            
            // Extraemos los datos guardados en la metadata del checkout
            const fiscalData = JSON.parse(paymentIntent.metadata.fiscal_data || '{}');
            const enviosYFletes = parseFloat(paymentIntent.metadata.shipping_cost || '0') + parseFloat(paymentIntent.metadata.freight_cost || '0');
            const serviceFee = parseFloat(paymentIntent.metadata.service_fee || '175');
            const customerData = { email: updatedOrder.customerEmail, name: updatedOrder.customerName };

            // Disparamos el misil a Facturapi
            const cfdi = await timbrarFacturaReal(
              customerData,
              fiscalData,
              updatedOrder.items,
              'stripe', // Método de pago
              enviosYFletes,
              serviceFee
            );

            if (cfdi.success) {
              // 🔥 Guardamos el LINK DIRECTO en la base de datos para que el cliente lo descargue en su perfil
              await prisma.order.update({
                where: { id: orderId },
                data: { invoiceStatus: cfdi.pdf }
              });
            } else {
              throw new Error(cfdi.error); // Si falló la API, brincamos al catch
            }

          } catch (facturaError: any) {
            console.error("⚠️ Falló el timbrado automático:", facturaError.message || facturaError);
            // Lo marcamos como ERROR para que el botón del perfil se ponga rojo
            await prisma.order.update({
              where: { id: orderId },
              data: { invoiceStatus: "ERROR" }
            });
          }
        }
        // =====================================================================

        
        // =====================================================================
        // ✉️ INYECCIÓN ZEPTOMAIL (Reporte al Patrón)
        // =====================================================================
        try {
          // 🚀 ARMAMOS LA INTELIGENCIA PARA EL CORREO CON TUS CAMPOS REALES
          const orderInfo = {
            orderId: updatedOrder.orderNumber, // Usamos tu orderNumber (cuid) más amigable
            customerName: updatedOrder.customerName,
            customerEmail: updatedOrder.customerEmail,
            customerPhone: updatedOrder.customerPhone || "No proporcionado",
            shippingMethod: updatedOrder.logisticsType.replace('_', ' '), // Ej. SKYDROPX_NACIONAL
            shippingAddress: updatedOrder.address || "Recolección en sucursal",
            paymentMethod: "Tarjeta (Stripe)",
            totalAmount: updatedOrder.total.toLocaleString('es-MX', { minimumFractionDigits: 2 }),
            
            // Mapeamos los items, incluyendo color y unidad si existen
            items: updatedOrder.items.map((item) => ({
              name: `${item.title} ${item.color ? `(${item.color})` : ''}`,
              quantity: `${item.quantity} ${item.unit || ''}`,
              price: item.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })
            }))
          };

          // Disparamos ZeptoMail
          await sendAdminOrderNotification(orderInfo);
          console.log("📨 Notificación de ZeptoMail enviada al Patrón.");

        } catch (mailError) {
          console.error("⚠️ El pago se guardó, pero falló el envío del correo:", mailError);
        }
        // =====================================================================

      } else {
        console.warn("⚠️ Pago exitoso pero sin order_id en la metadata:", paymentIntent.id)
      }
      break
    }

    // 2. EL PAGO FALLÓ O FUE RECHAZADO
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const orderId = paymentIntent.metadata.order_id

      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "FAILED", 
          },
        })
        console.warn(`❌ Pago rechazado para la orden de tienda ${orderId}`)
      }
      break
    }

    default:
      console.log(`ℹ️ Evento de tienda ignorado: ${event.type}`)
  }

  return new NextResponse("Webhook de tienda procesado", { status: 200 })
}