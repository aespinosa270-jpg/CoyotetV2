// src/app/api/membership/checkout/route.ts
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { auth } from "../../../../auth"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
})

const VALID_PLANS  = ["GOLD", "BLACK", "ELITE"] as const
const VALID_CYCLES = ["monthly", "annual"] as const
type PlanKey      = typeof VALID_PLANS[number]
type BillingCycle = typeof VALID_CYCLES[number]

export const POST = auth(async (req: Request) => {
  const session = (req as any).auth
  if (!session?.user?.email) {
    // FIX: NextResponse.json() en lugar de new NextResponse(string)
    // Antes devolvía text/plain → JSON.parse fallaba en el cliente
    return NextResponse.json(
      { error: "Acceso denegado: Inicia sesión primero" },
      { status: 401 }
    )
  }

  try {
    const body                       = await req.json()
    const planKey: PlanKey           = body.planKey
    const billingCycle: BillingCycle = body.billingCycle ?? "monthly"

    if (!VALID_PLANS.includes(planKey)) {
      return NextResponse.json({ error: `Plan inválido: ${planKey}` }, { status: 400 })
    }
    if (!VALID_CYCLES.includes(billingCycle)) {
      return NextResponse.json({ error: `Ciclo inválido: ${billingCycle}` }, { status: 400 })
    }

    const STRIPE_PRICE_IDS: Record<PlanKey, Record<BillingCycle, string | undefined>> = {
      GOLD:  { monthly: process.env.STRIPE_PRICE_GOLD_MONTHLY,  annual: process.env.STRIPE_PRICE_GOLD_ANNUAL  },
      BLACK: { monthly: process.env.STRIPE_PRICE_BLACK_MONTHLY, annual: process.env.STRIPE_PRICE_BLACK_ANNUAL },
      ELITE: { monthly: process.env.STRIPE_PRICE_ELITE_MONTHLY, annual: process.env.STRIPE_PRICE_ELITE_ANNUAL },
    }

    const priceId = STRIPE_PRICE_IDS[planKey][billingCycle]
    if (!priceId) {
      console.error(`❌ Price ID no configurado en .env para ${planKey} - ${billingCycle}`)
      return NextResponse.json(
        { error: `Precio no configurado para ${planKey} ${billingCycle}. Revisa las variables de entorno.` },
        { status: 500 }
      )
    }

    const user = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: {
        id:                   true,
        email:                true,
        name:                 true,
        stripeCustomerId:     true,
        stripeSubscriptionId: true,
        membershipTier:       true,
      },
    })
    if (!user) {
      return NextResponse.json({ error: "Socio no encontrado" }, { status: 404 })
    }

    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email:    user.email,
        name:     user.name || "Socio Comercial Coyote",
        metadata: { userId: user.id },
      })
      customerId = customer.id
      await prisma.user.update({
        where: { id: user.id },
        data:  { stripeCustomerId: customerId },
      })
    }

    if (user.stripeSubscriptionId) {
      try {
        const existing = await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
        const existingCustomerId =
          typeof existing.customer === "string" ? existing.customer : existing.customer.id

        if (existingCustomerId !== customerId) {
          console.error(`⚠️ Sub ${user.stripeSubscriptionId} pertenece a ${existingCustomerId}, no a ${customerId}. Limpiando.`)
          await prisma.user.update({
            where: { id: user.id },
            data:  { stripeSubscriptionId: null, stripeSubscriptionStatus: null },
          })
        } else {
          if (existing.status === "active" || existing.status === "trialing") {
            return NextResponse.json(
              { error: "Ya tienes una suscripción activa. Cancela la actual antes de cambiar de plan." },
              { status: 409 }
            )
          }
          if (existing.status === "incomplete") {
            await stripe.subscriptions.cancel(user.stripeSubscriptionId)
          }
        }
      } catch (error: any) {
        if (error?.statusCode !== 404) {
          console.error("❌ Error al verificar suscripción en Stripe:", error.message)
          throw error
        }
        console.warn("Sub anterior no encontrada en Stripe (404), continuando como nueva.")
      }
    }

    const subscription = await stripe.subscriptions.create({
      customer:         customerId,
      items:            [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand:           ["latest_invoice.payment_intent"],
      metadata:         { userId: user.id, planKey, billingCycle },
    })

    const invoice = subscription.latest_invoice as Stripe.Invoice | string | null
    if (!invoice || typeof invoice === "string") {
      throw new Error("No se pudo recuperar la factura de la suscripción.")
    }

    const rawPaymentIntent =
      (invoice as any).payment_intent ?? (invoice as any).payment?.payment_intent

    const paymentIntent =
      typeof rawPaymentIntent === "string"
        ? await stripe.paymentIntents.retrieve(rawPaymentIntent)
        : (rawPaymentIntent as Stripe.PaymentIntent | null)

    if (!paymentIntent?.client_secret) {
      throw new Error("No se pudo obtener el secreto de pago de Stripe.")
    }

    await prisma.user.update({
      where: { id: user.id },
      data:  { stripeSubscriptionId: subscription.id, stripeSubscriptionStatus: "incomplete" },
    })

    return NextResponse.json({
      success:        true,
      clientSecret:   paymentIntent.client_secret,
      subscriptionId: subscription.id,
    })

  } catch (error: any) {
    console.error("🔥 Error en checkout de membresía:", error.message)
    // FIX: también el catch final devuelve JSON
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    )
  }
})