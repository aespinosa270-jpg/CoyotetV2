// src/app/api/membership/webhook/route.ts
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { MembershipTier } from "@prisma/client"
import { sendMembresiaEmail } from "@/lib/zeptomail"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
})

type PlanKey = "GOLD" | "BLACK" | "ELITE"
const VALID_PLANS: PlanKey[] = ["GOLD", "BLACK", "ELITE"]

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = (invoice as any).subscription
  if (!sub) return null
  return typeof sub === "string" ? sub : sub.id
}

function unwrapStripeResponse<T>(res: Stripe.Response<T> | T): T {
  return ((res as any).data ?? res) as T
}

function getSubscriptionPeriodEnd(sub: Stripe.Subscription): Date | null {
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
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_MEMBERSHIP_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {

      // ───────────────────────────────────────────────────────────────────────
      case "invoice.payment_succeeded": {
        const invoice        = event.data.object as Stripe.Invoice
        const subscriptionId = getInvoiceSubscriptionId(invoice)
        if (!subscriptionId) break

        const sub     = unwrapStripeResponse(await stripe.subscriptions.retrieve(subscriptionId))
        const userId  = sub.metadata?.userId
        const planKey = sub.metadata?.planKey as PlanKey | undefined
        const expiry  = getSubscriptionPeriodEnd(sub)

        if (!userId || !planKey || !VALID_PLANS.includes(planKey)) {
          console.warn("⚠️ invoice.payment_succeeded sin userId o planKey válido:", sub.id)
          break
        }

        // Idempotencia: si el usuario ya tiene este tier activo con esta sub,
        // Stripe reenvió el evento. Ignorar para no reenviar el correo ni pisar datos.
        const alreadyProcessed = await prisma.user.findFirst({
          where: {
            id:                   userId,
            membershipTier:       MembershipTier[planKey],
            stripeSubscriptionId: sub.id,
          },
          select: { id: true },
        })
        if (alreadyProcessed) {
          console.log(`✅ Idempotent skip: invoice ya procesado para usuario ${userId}`)
          break
        }

        const dbUser = await prisma.user.findUnique({
          where:  { id: userId },
          select: { email: true, name: true },
        })
        if (!dbUser) {
          console.warn(`⚠️ Usuario no encontrado en BD: ${userId}`)
          break
        }

        await prisma.user.update({
          where: { id: userId },
          data: {
            membershipTier:              MembershipTier[planKey],
            stripeSubscriptionId:        sub.id,
            stripeSubscriptionStatus:    sub.status,
            membershipExpiry:            expiry,
            // Reset de colocaciones al activar/renovar la membresía
            membershipColocacionesUsadas: 0,
          },
        })
        console.log(`✅ Membresía activada: ${planKey} → usuario ${userId}`)

        // Correo de bienvenida — fallo no es crítico, la BD ya está actualizada
        try {
          const memberId = userId.substring(0, 4).toUpperCase()
          await sendMembresiaEmail(dbUser.email, dbUser.name || "Socio Comercial", memberId, planKey)
          console.log(`✉️ Correo de membresía ${planKey} enviado a ${dbUser.email}`)
        } catch (mailErr) {
          console.error("⚠️ Fallo ZeptoMail (tier activado correctamente en BD):", mailErr)
        }

        break
      }

      // ───────────────────────────────────────────────────────────────────────
      case "customer.subscription.updated": {
        const sub     = event.data.object as Stripe.Subscription
        const userId  = sub.metadata?.userId
        const planKey = sub.metadata?.planKey as PlanKey | undefined

        if (sub.status === "active" || sub.status === "trialing") {
          if (!planKey || !VALID_PLANS.includes(planKey)) {
            console.warn(`⚠️ subscription.updated sin planKey válido para sub ${sub.id}`)
            break
          }

          if (userId) {
            // Actualizar tier solo si aún no lo tiene (evita race con invoice.payment_succeeded)
            await prisma.user.updateMany({
              where: {
                id:  userId,
                NOT: { membershipTier: MembershipTier[planKey] },
              },
              data: {
                membershipTier:           MembershipTier[planKey],
                stripeSubscriptionStatus: sub.status,
                membershipExpiry:         getSubscriptionPeriodEnd(sub),
              },
            })
            // Siempre sincronizar status y expiry aunque el tier ya sea correcto
            await prisma.user.updateMany({
              where: { id: userId, stripeSubscriptionId: sub.id },
              data: {
                stripeSubscriptionStatus: sub.status,
                membershipExpiry:         getSubscriptionPeriodEnd(sub),
              },
            })
          } else {
            // Fallback por subscriptionId — rama separada, sin OR peligroso
            console.warn(`⚠️ metadata.userId vacío, buscando por sub.id: ${sub.id}`)
            await prisma.user.updateMany({
              where: {
                stripeSubscriptionId: sub.id,
                NOT: { membershipTier: MembershipTier[planKey] },
              },
              data: {
                membershipTier:           MembershipTier[planKey],
                stripeSubscriptionStatus: sub.status,
                membershipExpiry:         getSubscriptionPeriodEnd(sub),
              },
            })
          }
          console.log(`✅ Suscripción actualizada: ${planKey} → sub_id ${sub.id}`)

        } else if (sub.status === "past_due" || sub.status === "unpaid") {
          // Solo status — el tier se conserva mientras el usuario resuelve el pago
          await prisma.user.updateMany({
            where: { stripeSubscriptionId: sub.id },
            data:  { stripeSubscriptionStatus: sub.status },
          })
          console.warn(`⚠️ Pago fallido para sub_id ${sub.id}: ${sub.status}`)

        } else if (sub.status === "canceled" || sub.status === "paused") {
          await deactivateMembership(sub.id)
        }

        break
      }

      // ───────────────────────────────────────────────────────────────────────
      case "customer.subscription.deleted":
      case "customer.subscription.paused": {
        const sub = event.data.object as Stripe.Subscription
        await deactivateMembership(sub.id)
        console.log(`🔻 Membresía cancelada/pausada → sub_id ${sub.id} vuelve a NONE`)
        break
      }

      // ───────────────────────────────────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice        = event.data.object as Stripe.Invoice
        const subscriptionId = getInvoiceSubscriptionId(invoice)
        if (!subscriptionId) break

        await prisma.user.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data:  { stripeSubscriptionStatus: "past_due" },
        })
        console.warn(`⚠️ Pago fallido en invoice ${invoice.id} → sub_id ${subscriptionId}`)
        break
      }

      default:
        break
    }
  } catch (err: any) {
    console.error(`🔥 Error procesando evento ${event.type}:`, err.message)
    return NextResponse.json({ received: true, warning: err.message })
  }

  return NextResponse.json({ received: true })
}

// ── Helper: revertir membresía a NONE ────────────────────────────────────────
async function deactivateMembership(subscriptionId: string) {
  try {
    await prisma.user.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        membershipTier:               MembershipTier.NONE,
        stripeSubscriptionId:         null,
        stripeSubscriptionStatus:     "canceled",
        membershipExpiry:             null,
        membershipColocacionesUsadas: 0,
      },
    })
  } catch (error) {
    console.error(`Error desactivando membresía para sub_id ${subscriptionId}:`, error)
  }
}