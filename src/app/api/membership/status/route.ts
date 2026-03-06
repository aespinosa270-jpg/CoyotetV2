// src/app/api/membership/status/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { MembershipTier } from "@prisma/client"
import { getColocacionesGratis, calcularPuntos } from "@/lib/membership-benefits"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      membershipTier:           true, // MembershipTier enum: NONE | GOLD | BLACK | ELITE
      points:                   true, // ✅ campo real: "points" (no membershipPoints)
      membershipExpiry:         true, // ✅ campo real (no membershipRenewalDate)
      stripeSubscriptionStatus: true,
      // Colocaciones usadas — campo nuevo, ver nota abajo
      // membershipColocacionesUsadas: true,
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
  const colocacionesTotal = getColocacionesGratis(tier)
  const gastoMesActual = user.orders.reduce((sum, o) => sum + (o.total ?? 0), 0)

  // ⚠️ NOTA: membershipColocacionesUsadas requiere migración de Prisma.
  // Mientras tanto usamos 0. Ver sección "Migración pendiente" abajo.
  const colocacionesUsadas = 0 // TODO: user.membershipColocacionesUsadas ?? 0

  return NextResponse.json({
    tier,
    puntos:                   user.points ?? 0,
    colocacionesUsadas,
    colocacionesTotal,
    colocacionesRestantes:    Math.max(0, colocacionesTotal - colocacionesUsadas),
    proximoRenovacion:        user.membershipExpiry?.toISOString() ?? null,
    stripeSubscriptionStatus: user.stripeSubscriptionStatus,
    gastoMesActual,
    // Para el checkout banner — ELITE no paga tarifa de servicio
    tarifaServicio: tier === MembershipTier.ELITE ? 0 : 1,
    // Puntos que ganaría con el gasto actual del mes
    puntosEstimadosMes: calcularPuntos(gastoMesActual, tier),
  })
}