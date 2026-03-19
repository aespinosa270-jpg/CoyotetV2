// src/app/api/membership/status/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { MembershipTier } from "@prisma/client"
import { getColocacionesGratis, calcularPuntos } from "@/lib/membership-benefits"

// Tarifa de servicio por tier.
// Si membership-benefits.ts ya exporta TARIFA_SERVICIO, importarlo desde ahí
// y eliminar este objeto local.
const TARIFA_SERVICIO: Record<MembershipTier, number> = {
  NONE:  0.03,
  GOLD:  0.02,
  BLACK: 0.01,
  ELITE: 0,
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where:  { email: session.user.email },
    select: {
      membershipTier:               true,
      points:                       true,
      membershipExpiry:             true,
      stripeSubscriptionStatus:     true,
      membershipColocacionesUsadas: true, // campo real — existe en el schema
      orders: {
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
          status: { not: "CANCELLED" },
        },
        select: { total: true },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const tier = user.membershipTier ?? MembershipTier.NONE

  const colocacionesTotal  = getColocacionesGratis(tier)
  const colocacionesUsadas = user.membershipColocacionesUsadas ?? 0
  const gastoMesActual     = user.orders.reduce((sum, o) => sum + (o.total ?? 0), 0)

  return NextResponse.json({
    tier,
    puntos:                   user.points ?? 0,
    colocacionesUsadas,
    colocacionesTotal,
    colocacionesRestantes:    Math.max(0, colocacionesTotal - colocacionesUsadas),
    proximoRenovacion:        user.membershipExpiry?.toISOString() ?? null,
    stripeSubscriptionStatus: user.stripeSubscriptionStatus,
    gastoMesActual,
    tarifaServicio:           TARIFA_SERVICIO[tier],
    puntosEstimadosMes:       calcularPuntos(gastoMesActual, tier),
  })
}