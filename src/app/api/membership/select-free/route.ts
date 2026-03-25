// src/app/api/membership/select-free/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { MembershipTier } from "@prisma/client"
import Stripe from "stripe"
import { auth } from "../../../../auth"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
})

export const POST = auth(async (req: Request) => {
  const session = (req as any).auth
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: {
        id:                       true,
        membershipTier:           true,
        stripeSubscriptionId:     true,
        stripeSubscriptionStatus: true,
      },
    })
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    if (user.membershipTier === MembershipTier.NONE && !user.stripeSubscriptionId) {
      return NextResponse.json({
        success:           true,
        tier:              "NONE",
        cancelAtPeriodEnd: false,
        message:           "Ya estás en el plan gratuito.",
      })
    }

    if (user.stripeSubscriptionId) {
      try {
        const existing = await stripe.subscriptions.retrieve(user.stripeSubscriptionId)

        if (existing.status === "active" || existing.status === "trialing") {
          await stripe.subscriptions.update(user.stripeSubscriptionId, {
            cancel_at_period_end: true,
          })
          return NextResponse.json({
            success:           true,
            tier:              user.membershipTier,
            cancelAtPeriodEnd: true,
            message:
              "Tu suscripción se cancelará al final del período actual. " +
              "Conservas tus beneficios hasta esa fecha.",
          })
        }

        if (existing.status !== "canceled") {
          await stripe.subscriptions.cancel(user.stripeSubscriptionId)
        }
      } catch (error: any) {
        if (error?.statusCode !== 404) {
          console.error("❌ Error cancelando suscripción en Stripe:", error.message)
          return NextResponse.json(
            { error: "No se pudo cancelar la suscripción. Intenta de nuevo o contacta soporte." },
            { status: 500 }
          )
        }
        console.warn("Sub no encontrada en Stripe (404), limpiando referencia.")
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        membershipTier:               MembershipTier.NONE,
        stripeSubscriptionId:         null,
        stripeSubscriptionStatus:     "canceled",
        membershipExpiry:             null,
        membershipColocacionesUsadas: 0,
      },
    })

    return NextResponse.json({
      success:           true,
      tier:              "NONE",
      cancelAtPeriodEnd: false,
      message:           "Has vuelto al plan gratuito.",
    })

  } catch (error: any) {
    console.error("🔥 Error en select-free:", error.message)
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    )
  }
})