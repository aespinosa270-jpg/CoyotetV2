// src/app/api/checkout/route.ts
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { MembershipTier } from "@prisma/client"
import { getColocacionesGratis } from "@/lib/membership-benefits"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
})

// ─── Tabla de acumulación de puntos ──────────────────────────────────────────
// Puntos ganados por cada $100 MXN de mercancía comprada
const PUNTOS_POR_100: Record<MembershipTier, number> = {
  [MembershipTier.NONE]:  0.5,  // Básico:  0.5 pts / $100
  [MembershipTier.GOLD]:  1,    // Gold:    1   pt  / $100
  [MembershipTier.BLACK]: 2,    // Black:   2   pts / $100
  [MembershipTier.ELITE]: 4,    // Elite:   4   pts / $100
}

const PESOS_POR_PUNTO = 0.50   // 1 punto = $0.50 MXN al canjear
const MAX_CANJE_PCT   = 0.20   // Máximo canjeable = 20% del total
const SERVICE_FEE     = 175    // Tarifa base (ELITE paga $0)

// ─── Helpers internos ─────────────────────────────────────────────────────────
function calcularPuntosGanados(subtotalMercancia: number, tier: MembershipTier): number {
  // Ej. BLACK + $350 MXN → (350/100) × 2 = 7 pts
  // Ej. NONE  + $350 MXN → (350/100) × 0.5 = 1.75 → floor×10/10 = 1.7 pts
  return Math.floor((subtotalMercancia / 100) * PUNTOS_POR_100[tier] * 10) / 10
}

function calcularDescuentoPuntos(puntos: number): number {
  // $0.50 por punto, redondeado a pesos enteros hacia abajo
  return Math.floor(puntos * PESOS_POR_PUNTO)
}

function maxCanjeable(puntosDisponibles: number, totalCompra: number): number {
  const limiteCompraMXN  = Math.floor(totalCompra * MAX_CANJE_PCT)
  const limitePorPuntos  = Math.floor(limiteCompraMXN / PESOS_POR_PUNTO)
  return Math.min(puntosDisponibles, limitePorPuntos)
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      customer,
      amount,          // total calculado en el frontend (ANTES del descuento de puntos)
      description,
      items,
      puntosUsados: puntosUsadosRaw = 0,
      metadata,
    } = body

    // ── 1. Leer sesión y datos reales de la BD ────────────────────────────────
    const session = await getServerSession(authOptions)

    let dbUser: {
      id:                           string
      membershipTier:               MembershipTier
      membershipColocacionesUsadas: number
      points:                       number
      stripeCustomerId:             string | null
    } | null = null

    if (session?.user?.email) {
      dbUser = await prisma.user.findUnique({
        where:  { email: session.user.email },
        select: {
          id:                           true,
          membershipTier:               true,
          membershipColocacionesUsadas: true,
          points:                       true,
          stripeCustomerId:             true,
        },
      })
    }

    const tier    = dbUser?.membershipTier ?? MembershipTier.NONE
    const isElite = tier === MembershipTier.ELITE

    // ── 2. Validar puntos a canjear ───────────────────────────────────────────
    // El servidor siempre recalcula el límite — no confiamos en el frontend
    const puntosDisponibles  = dbUser?.points ?? 0
    const puntosRequeridos   = dbUser ? Math.max(0, Math.floor(Number(puntosUsadosRaw))) : 0
    const limiteMax          = maxCanjeable(puntosDisponibles, amount)
    // Si el frontend pide más de lo permitido, aplicamos el máximo silenciosamente
    const puntosConfirmados  = Math.min(puntosRequeridos, limiteMax)
    const descuentoPuntosMXN = calcularDescuentoPuntos(puntosConfirmados)

    // ── 3. Tarifa de servicio ─────────────────────────────────────────────────
    const realServiceFee = isElite ? 0 : SERVICE_FEE

    // ── 4. Subtotal de mercancía ──────────────────────────────────────────────
    const subtotalMercancia = items.reduce(
      (sum: number, item: any) => sum + Number(item.price) * Number(item.quantity),
      0
    )

    // ── 5. Puntos ganados en esta compra ──────────────────────────────────────
    // Siempre sobre el subtotal de mercancía pura (sin fees, sin descuentos)
    const puntosGanados = calcularPuntosGanados(subtotalMercancia, tier)

    // ── 6. Total final que Stripe cobra ──────────────────────────────────────
    const totalCobrado = Math.max(0, amount - descuentoPuntosMXN)

    // ── 7. Colocaciones del mes ───────────────────────────────────────────────
    const colocacionesTotal     = getColocacionesGratis(tier)
    const colocacionesUsadas    = dbUser?.membershipColocacionesUsadas ?? 0
    const colocacionesRestantes = Math.max(0, colocacionesTotal - colocacionesUsadas)
    const usaColocacionGratis   = colocacionesRestantes > 0

    // ── 8. Resolver productId real para cada item ─────────────────────────────
    // El carrito puede traer item.id (id local del carrito) o item.productId.
    // Verificamos que el productId exista en Product; si no, buscamos por SKU.
    const resolvedItems = await Promise.all(
      items.map(async (item: any) => {
        const candidateId = item.productId || item.id
        if (candidateId) {
          const found = await prisma.product.findUnique({
            where: { id: candidateId }, select: { id: true }
          })
          if (found) return { ...item, resolvedProductId: found.id }
        }
        if (item.sku) {
          const bySku = await prisma.product.findUnique({
            where: { sku: item.sku }, select: { id: true }
          })
          if (bySku) return { ...item, resolvedProductId: bySku.id }
        }
        return { ...item, resolvedProductId: null }
      })
    )

    // ── 9. Crear orden ────────────────────────────────────────────────────────
    const newOrder = await prisma.order.create({
      data: {
        user: {
          connectOrCreate: {
            where:  { email: customer.email },
            create: {
              email:        customer.email,
              name:         `${customer.name} ${customer.lastName}`.trim(),
              password:     `guest_${Date.now()}`,
              phone:        customer.phone,
              street:       customer.street,
              neighborhood: customer.neighborhood,
              zipCode:      customer.zip,
              city:         customer.city,
              state:        customer.state,
            },
          },
        },
        total:         totalCobrado,
        subtotal:      subtotalMercancia,
        serviceFee:    realServiceFee,
        status:        "PENDING",
        paymentMethod: "stripe_custom",
        customerName:  `${customer.name} ${customer.lastName}`.trim(),
        customerEmail: customer.email,
        address:       `${customer.street} ${customer.number || ""}, CP ${customer.zip}`.trim(),
        items: {
          create: resolvedItems.map((item: any) => ({
            ...(item.resolvedProductId ? { product: { connect: { id: item.resolvedProductId } } } : {}),
            title:    item.title,
            price:    Number(item.price),
            quantity: Number(item.quantity),
            unit:     item.unit        || null,
            color:    item.meta?.color || null,
            sku:      item.sku         || null,
          })),
        },
      },
    })

    // ── 9. Actualizar puntos del usuario ──────────────────────────────────────
    // Delta neto = puntos ganados − puntos canjeados
    // Usamos increment con el delta para hacerlo en una sola operación
    if (dbUser) {
      const deltaPuntos = (Math.floor(puntosGanados * 10) / 10) - puntosConfirmados

      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          points:           { increment: deltaPuntos },
          ltv:              { increment: totalCobrado },
          ...(usaColocacionGratis && {
            membershipColocacionesUsadas: { increment: 1 },
          }),
        },
      })
    }

    // ── 10. Stripe Customer ───────────────────────────────────────────────────
    let stripeCustomerId: string

    if (dbUser?.stripeCustomerId) {
      stripeCustomerId = dbUser.stripeCustomerId
    } else {
      const existing = await stripe.customers.list({ email: customer.email, limit: 1 })
      if (existing.data.length > 0) {
        stripeCustomerId = existing.data[0].id
      } else {
        const newCustomer = await stripe.customers.create({
          email: customer.email, name: `${customer.name} ${customer.lastName}`.trim(), phone: customer.phone,
          metadata: { userId: dbUser?.id ?? "guest" },
        })
        stripeCustomerId = newCustomer.id
        if (dbUser) await prisma.user.update({ where: { id: dbUser.id }, data: { stripeCustomerId } })
      }
    }

    // ── 11. PaymentIntent ─────────────────────────────────────────────────────
    const paymentIntent = await stripe.paymentIntents.create({
      amount:        Math.round(totalCobrado * 100), // centavos
      currency:      "mxn",
      customer:      stripeCustomerId,
      description,
      receipt_email: customer.email,
      payment_method_types: ["card", "customer_balance", "oxxo"],
      payment_method_options: {
        customer_balance: {
          funding_type:  "bank_transfer",
          bank_transfer: { type: "mx_bank_transfer" },
        },
      },
      metadata: {
        order_id:           newOrder.id,
        user_id:            dbUser?.id  ?? "guest",
        tier,
        service_fee:        realServiceFee.toString(),
        puntos_usados:      puntosConfirmados.toString(),
        descuento_puntos:   descuentoPuntosMXN.toString(),
        puntos_ganados:     (Math.floor(puntosGanados * 10) / 10).toString(),
        colocacion_gratis:  usaColocacionGratis ? "YES" : "NO",
        canal:              "web_b2b",
        ...metadata,
      },
    })

    // ── 12. Respuesta ─────────────────────────────────────────────────────────
    return NextResponse.json({
      success:      true,
      clientSecret: paymentIntent.client_secret,
      orderId:      newOrder.id,
      resumen: {
        tier,
        puntosGanados:       Math.floor(puntosGanados * 10) / 10,
        puntosConfirmados,
        descuentoPuntosMXN,
        serviceFee:          realServiceFee,
        colocacionGratis:    usaColocacionGratis,
        colocacionesRestantes,
        totalCobrado,
      },
    })

  } catch (error: any) {
    console.error("❌ Error Checkout:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}