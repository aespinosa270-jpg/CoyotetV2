// src/app/api/membership/checkout/route.ts
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
})

// ─── Price IDs desde .env ──────────────────────────────────────────────────────
// Agrega a .env.local:
//   STRIPE_PRICE_GOLD_MONTHLY=price_xxx
//   STRIPE_PRICE_GOLD_ANNUAL=price_xxx
//   STRIPE_PRICE_BLACK_MONTHLY=price_xxx
//   STRIPE_PRICE_BLACK_ANNUAL=price_xxx
//   STRIPE_PRICE_ELITE_MONTHLY=price_xxx
//   STRIPE_PRICE_ELITE_ANNUAL=price_xxx
const STRIPE_PRICE_IDS: Record<string, { monthly: string; annual: string }> = {
  GOLD: {
    monthly: process.env.STRIPE_PRICE_GOLD_MONTHLY!,
    annual:  process.env.STRIPE_PRICE_GOLD_ANNUAL!,
  },
  BLACK: {
    monthly: process.env.STRIPE_PRICE_BLACK_MONTHLY!,
    annual:  process.env.STRIPE_PRICE_BLACK_ANNUAL!,
  },
  ELITE: {
    monthly: process.env.STRIPE_PRICE_ELITE_MONTHLY!,
    annual:  process.env.STRIPE_PRICE_ELITE_ANNUAL!,
  },
}

// Coinciden exactamente con el enum MembershipTier de schema.prisma
const VALID_PLANS = ["GOLD", "BLACK", "ELITE"] as const
const VALID_CYCLES = ["monthly", "annual"] as const
type PlanKey = typeof VALID_PLANS[number]
type BillingCycle = typeof VALID_CYCLES[number]

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return new NextResponse("Acceso denegado: Inicia sesión primero", { status: 401 })
  }

  try {
    const body = await req.json()
    const planKey: PlanKey      = body.planKey
    const billingCycle: BillingCycle = body.billingCycle ?? "monthly"

    // ── Validación ─────────────────────────────────────────────────────────────
    if (!VALID_PLANS.includes(planKey)) {
      return new NextResponse(`Plan inválido: ${planKey}`, { status: 400 })
    }
    if (!VALID_CYCLES.includes(billingCycle)) {
      return new NextResponse(`Ciclo inválido: ${billingCycle}`, { status: 400 })
    }

    const priceId = STRIPE_PRICE_IDS[planKey][billingCycle]
    if (!priceId) {
      console.error(`❌ Price ID no configurado en .env para ${planKey} - ${billingCycle}`)
      return new NextResponse(
        `Precio no configurado para ${planKey} ${billingCycle}. Revisa las variables de entorno.`,
        { status: 500 }
      )
    }

    // ── Usuario ─────────────────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        membershipTier: true,
      },
    })

    if (!user) {
      return new NextResponse("Socio no encontrado", { status: 404 })
    }

    // Guardia: si ya tiene suscripción activa en Stripe, no crear otra
    if (user.stripeSubscriptionId) {
      try {
        const existing = await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
        if (existing.status === "active" || existing.status === "trialing") {
          return new NextResponse(
            "Ya tienes una suscripción activa. Cancela la actual antes de cambiar de plan.",
            { status: 409 }
          )
        }
      } catch {
        // Suscripción no existe en Stripe — continuamos sin problema
      }
    }

    // ── Obtener o crear Customer en Stripe ──────────────────────────────────────
    let customerId = user.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        name: user.name || "Socio Comercial Coyote",
        metadata: { userId: user.id },
      })
      customerId = customer.id

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // ── Crear suscripción incompleta ────────────────────────────────────────────
    // "incomplete" hasta que el frontend confirme el PaymentElement
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        userId: user.id,
        planKey,
        billingCycle,
      },
    })

    // ── Extraer clientSecret ────────────────────────────────────────────────────
    const invoice = subscription.latest_invoice as Stripe.Invoice
    const paymentIntent = (invoice as any).payment_intent as Stripe.PaymentIntent

    if (!paymentIntent?.client_secret) {
      console.error("❌ No se obtuvo clientSecret del PaymentIntent:", subscription.id)
      return new NextResponse("Error interno: no se obtuvo el secreto de pago", { status: 500 })
    }

    // ── Pre-registrar subscriptionId en BD ─────────────────────────────────────
    // OJO: membershipTier NO se actualiza aquí todavía.
    // El webhook invoice.payment_succeeded lo hará al confirmar el cobro.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionStatus: "incomplete", // campo real del schema
      },
    })

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
    })
  } catch (error: any) {
    console.error("🔥 Error de Transacción en Membresía:", error.message)
    return new NextResponse(error.message, { status: 500 })
  }
}