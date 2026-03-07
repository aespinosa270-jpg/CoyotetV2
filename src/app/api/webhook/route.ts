// src/app/api/checkout/webhook/route.ts
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"

// 🐺 Inicializamos Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
})

// Usaremos un secreto DISTINTO para el webhook del carrito de compras
const webhookSecret = process.env.STRIPE_CHECKOUT_WEBHOOK_SECRET!

export async function POST(req: Request) {
  // Extraemos el cuerpo crudo de la petición
  const body = await req.text()
  
  // FIX PARA NEXT.JS 15+: Esperamos la promesa de headers()
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
      
      // Extraemos el ID de la orden que inyectamos en la metadata en src/app/api/checkout/route.ts
      const orderId = paymentIntent.metadata.order_id

      if (orderId) {
        // Actualizamos la orden en Prisma a "PAID" (o el status que uses para órdenes pagadas)
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "PAID", 
            // isPaid: true, // Descomenta esto si tienes un booleano de isPaid en tu schema de Order
          },
        })
        console.log(`✅ Pago de productos exitoso. Orden ${orderId} marcada como pagada.`)
        
        // 💡 Opcional: Aquí podrías disparar otro correo de ZeptoMail con el recibo de compra
      } else {
        console.warn("⚠️ Pago exitoso pero sin order_id en la metadata:", paymentIntent.id)
      }
      break
    }

    // 2. EL PAGO DE LA TARJETA FALLÓ O FUE RECHAZADO POR EL BANCO
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const orderId = paymentIntent.metadata.order_id

      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "FAILED", // O "CANCELED" según tu schema
          },
        })
        console.warn(`❌ Pago rechazado para la orden de tienda ${orderId}`)
      }
      break
    }

    // 3. EVENTO NO RECONOCIDO
    default:
      console.log(`ℹ️ Evento de tienda ignorado: ${event.type}`)
  }

  // Siempre debemos responder 200 rápido para que Stripe no reintente
  return new NextResponse("Webhook de tienda procesado", { status: 200 })
}