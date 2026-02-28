import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"

// 🐺 Inicializamos Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
})

// El secreto de firma de tu Webhook (el que empieza con whsec_ en tu dashboard)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  // Extraemos el cuerpo crudo de la petición (Stripe lo exige así por seguridad)
  const body = await req.text()
  const signature = headers().get("Stripe-Signature") as string

  let event: Stripe.Event

  try {
    // Verificamos criptográficamente que el mensaje viene de Stripe y no de un atacante
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error: any) {
    console.error("🔥 Error de firma en el Webhook:", error.message)
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 })
  }

  // 1. EL CLIENTE PAGÓ CON ÉXITO
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice
    const subscriptionId = (invoice as unknown as { subscription?: string | null }).subscription

    // Verificamos que esta factura sea de una suscripción
    if (subscriptionId) {
      // Obtenemos la suscripción completa para leer la "metadata" que le inyectaste al crearla
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)

      const userId = subscription.metadata.userId
      const planKey = subscription.metadata.planKey as any // "GOLD", "BLACK" o "ELITE"

      if (userId && planKey) {
        // 🐺 AHORA SÍ: Actualizamos el nivel del socio en Coyote Textil
        await prisma.user.update({
          where: { id: userId },
          data: {
            membershipTier: planKey,
            stripeSubscriptionStatus: "active",
          },
        })
        console.log(`✅ ¡Cobro exitoso! Socio comercial ${userId} ascendido a ${planKey}`)
      }
    }
  }

  // 2. EL CLIENTE CANCELÓ O SE LE CAYÓ EL PAGO DEFINITIVAMENTE
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription
    const userId = subscription.metadata.userId

    if (userId) {
      // Le quitamos los beneficios B2B
      await prisma.user.update({
        where: { id: userId },
        data: {
          membershipTier: "NONE",
          stripeSubscriptionStatus: "canceled",
        },
      })
      console.log(`❌ Suscripción cancelada para el socio ${userId}`)
    }
  }

  // Siempre debemos responder 200 rápido para que Stripe no reintente
  return new NextResponse("Webhook recibido y procesado", { status: 200 })
}