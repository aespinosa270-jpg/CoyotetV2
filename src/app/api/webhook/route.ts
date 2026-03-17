// src/app/api/checkout/webhook/route.ts
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { sendAdminOrderNotification } from "@/lib/mailer" // 🔥 Tu misil de ZeptoMail

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
        // 🔥 Actualizamos a "PAID" e incluimos los "items" exactos de tu Prisma
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "PAID", 
            paymentId: paymentIntent.id, // Guardamos el ID de pago de Stripe por si hay devoluciones
          },
          include: {
            items: true, // <- Exactamente como se llama en tu schema.prisma
          }
        })
        
        console.log(`✅ Pago exitoso. Orden ${updatedOrder.orderNumber} marcada como PAGADA.`)
        
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

          // ✉️ DISPARAMOS ZEPTOMAIL
          await sendAdminOrderNotification(orderInfo);
          console.log("📨 Notificación de ZeptoMail enviada al Patrón.");

        } catch (mailError) {
          console.error("⚠️ El pago se guardó, pero falló el envío del correo:", mailError);
        }

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