// src/app/api/membership/webhook/route.ts
// Stripe webhook — sincroniza estado de suscripción con PostgreSQL
//
// Eventos a registrar en Stripe Dashboard → Developers → Webhooks:
//   customer.subscription.updated
//   customer.subscription.deleted
//   customer.subscription.paused
//   invoice.payment_succeeded
//   invoice.payment_failed
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { MembershipTier } from "@prisma/client" // ✅ Enum real de Prisma

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
})

// Valores válidos del enum MembershipTier del schema:
// NONE | GOLD | BLACK | ELITE
// "BASICA" NO existe en el schema — el default es NONE
type PlanKey = "GOLD" | "BLACK" | "ELITE"
const VALID_PLANS: PlanKey[] = ["GOLD", "BLACK", "ELITE"]

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  // Stripe typings can vary by version; subscription may be missing from the Invoice type.
  const subscription = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null })
    .subscription

  if (!subscription) return null
  return typeof subscription === "string" ? subscription : subscription.id
}

function unwrapStripeResponse<T>(res: Stripe.Response<T> | T): T {
  return ((res as any).data ?? res) as T
}

function getSubscriptionPeriodEnd(sub: Stripe.Subscription): Date | null {
  // Some Stripe API versions/previews rename/remove `current_period_end`.
  const endSeconds =
    (sub as any).current_period_end ??
    (sub as any).current_period?.end ??
    (sub as any).current_period_end_at

  return typeof endSeconds === "number" ? new Date(endSeconds * 1000) : null
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {

      // ── Pago confirmado — AQUÍ se activa la membresía ──────────────────────
      // Se dispara en el primer cobro y en cada renovación mensual/anual
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = getInvoiceSubscriptionId(invoice)
        if (!subscriptionId) break

        const sub = unwrapStripeResponse(await stripe.subscriptions.retrieve(subscriptionId))
        const userId  = sub.metadata?.userId
        const planKey = sub.metadata?.planKey as PlanKey | undefined
        const expiry  = getSubscriptionPeriodEnd(sub)

        if (!userId || !planKey || !VALID_PLANS.includes(planKey)) {
          console.warn("⚠️ invoice.payment_succeeded sin userId o planKey válido:", sub.id)
          break
        }

        await prisma.user.update({
          where: { id: userId },
          data: {
            membershipTier:           MembershipTier[planKey], // GOLD | BLACK | ELITE
            stripeSubscriptionId:     sub.id,
            stripeSubscriptionStatus: sub.status,             // "active"
            membershipExpiry:         expiry, // ✅ campo real del schema (nullable)
          },
        })

        console.log(`✅ Membresía activada: ${planKey} → usuario ${userId}`)
        break
      }

      // ── Suscripción actualizada (reactivación, cambio de estado) ───────────
      case "customer.subscription.updated": {
        const sub     = event.data.object as Stripe.Subscription
        const userId  = sub.metadata?.userId
        const planKey = sub.metadata?.planKey as PlanKey | undefined

        if (!userId) break

        if ((sub.status === "active" || sub.status === "trialing") && planKey && VALID_PLANS.includes(planKey)) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              membershipTier:           MembershipTier[planKey],
              stripeSubscriptionStatus: sub.status,
              membershipExpiry:         getSubscriptionPeriodEnd(sub),
            },
          })
          console.log(`✅ Suscripción actualizada: ${planKey} → usuario ${userId}`)

        } else if (sub.status === "past_due" || sub.status === "unpaid") {
          // Pago fallido: marcamos el status sin bajar el tier todavía
          // (Stripe reintentará el cobro — solo bajamos si llega subscription.deleted)
          await prisma.user.update({
            where: { id: userId },
            data: { stripeSubscriptionStatus: sub.status },
          })
          console.warn(`⚠️ Pago fallido para usuario ${userId}: ${sub.status}`)

        } else if (sub.status === "canceled" || sub.status === "paused") {
          // Cancelación desde el portal de Stripe — también limpiamos
          await deactivateMembership(userId)
        }

        break
      }

      // ── Suscripción cancelada o pausada explícitamente ─────────────────────
      case "customer.subscription.deleted":
      case "customer.subscription.paused": {
        const sub    = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (!userId) break

        await deactivateMembership(userId)
        console.log(`🔻 Membresía cancelada → usuario ${userId} vuelve a NONE`)
        break
      }

      // ── Pago fallido después de reintentos ─────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = getInvoiceSubscriptionId(invoice)
        if (!subscriptionId) break

        const sub    = unwrapStripeResponse(await stripe.subscriptions.retrieve(subscriptionId))
        const userId = sub.metadata?.userId
        if (!userId) break

        // Solo actualizamos el status — no bajamos el tier hasta que Stripe cancele
        await prisma.user.update({
          where: { id: userId },
          data: { stripeSubscriptionStatus: "past_due" },
        })
        console.warn(`⚠️ Pago fallido en invoice ${invoice.id} → usuario ${userId}`)
        break
      }

      default:
        break
    }
  } catch (err: any) {
    console.error(`🔥 Error procesando evento ${event.type}:`, err.message)
    // Retornamos 200 para que Stripe no reintente en bucle
    // Los errores críticos quedan en los logs del servidor
    return NextResponse.json({ received: true, warning: err.message })
  }

  return NextResponse.json({ received: true })
}

// ─── Helper: revertir a estado base ───────────────────────────────────────────
async function deactivateMembership(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      membershipTier:           MembershipTier.NONE, // ✅ default real del schema
      stripeSubscriptionId:     null,
      stripeSubscriptionStatus: "canceled",
      membershipExpiry:         null,
    },
  })
}