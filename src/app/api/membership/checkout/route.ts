// src/app/api/membership/checkout/route.ts
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
})

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

    // ── Validación de entrada ──────────────────────────────────────────────────
    if (!VALID_PLANS.includes(planKey)) {
      return new NextResponse(`Plan inválido: ${planKey}`, { status: 400 })
    }
    if (!VALID_CYCLES.includes(billingCycle)) {
      return new NextResponse(`Ciclo inválido: ${billingCycle}`, { status: 400 })
    }

    // Mapeo seguro de precios en runtime (evita crashes de build-time en Next.js)
    const STRIPE_PRICE_IDS: Record<PlanKey, Record<BillingCycle, string | undefined>> = {
      GOLD: {
        monthly: process.env.STRIPE_PRICE_GOLD_MONTHLY,
        annual:  process.env.STRIPE_PRICE_GOLD_ANNUAL,
      },
      BLACK: {
        monthly: process.env.STRIPE_PRICE_BLACK_MONTHLY,
        annual:  process.env.STRIPE_PRICE_BLACK_ANNUAL,
      },
      ELITE: {
        monthly: process.env.STRIPE_PRICE_ELITE_MONTHLY,
        annual:  process.env.STRIPE_PRICE_ELITE_ANNUAL,
      },
    }

    const priceId = STRIPE_PRICE_IDS[planKey][billingCycle]
    if (!priceId) {
      console.error(`❌ Price ID no configurado en .env para ${planKey} - ${billingCycle}`)
      return new NextResponse(
        `Precio no configurado para ${planKey} ${billingCycle}. Revisa las variables de entorno.`,
        { status: 500 }
      )
    }

    // ── Usuario de BD ──────────────────────────────────────────────────────────
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

    // ── Control de Suscripciones Previas (Evitar Basura en Stripe) ─────────────
    if (user.stripeSubscriptionId) {
      try {
        const existing = await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
        
        if (existing.status === "active" || existing.status === "trialing") {
          return new NextResponse(
            "Ya tienes una suscripción activa. Cancela la actual antes de cambiar de plan.",
            { status: 409 }
          )
        }
        
        // Si hay una incompleta (ej. cerró la ventana ayer y hoy lo vuelve a intentar),
        // la cancelamos en Stripe para no dejar suscripciones huérfanas acumulándose.
        if (existing.status === "incomplete") {
          await stripe.subscriptions.cancel(user.stripeSubscriptionId)
        }
      } catch (error) {
        console.warn(`Suscripción anterior no encontrada en Stripe, continuando...`)
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

    // ── Crear nueva suscripción incompleta ─────────────────────────────────────
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

    // ── Extraer clientSecret de forma segura ───────────────────────────────────
    const invoice = subscription.latest_invoice as Stripe.Invoice | string | null
    if (!invoice || typeof invoice === "string") {
      throw new Error("No se pudo recuperar la factura de la suscripción.")
    }

    // Stripe ha ido moviendo el PaymentIntent de la factura entre campos
    // (`payment_intent` directo en la Invoice vs. dentro de `payment.payment_intent`).
    // Usamos `any` para ser resilientes a cambios de typings entre versiones.
    const rawPaymentIntent =
      (invoice as any).payment_intent ??
      (invoice as any).payment?.payment_intent

    const paymentIntent =
      typeof rawPaymentIntent === "string"
        ? await stripe.paymentIntents.retrieve(rawPaymentIntent)
        : (rawPaymentIntent as Stripe.PaymentIntent | null)

    if (!paymentIntent || !paymentIntent.client_secret) {
      throw new Error("No se pudo obtener el secreto de pago de Stripe.")
    }

    // ── Pre-registrar subscriptionId en BD ─────────────────────────────────────
    // Esperaremos al webhook para confirmar el pago y subirlo de nivel.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionStatus: "incomplete",
      },
    })

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
    })
    
  } catch (error: any) {
    console.error("🔥 Error de Transacción en Membresía:", error.message)
    return new NextResponse(error.message || "Error interno del servidor", { status: 500 })
  }
}