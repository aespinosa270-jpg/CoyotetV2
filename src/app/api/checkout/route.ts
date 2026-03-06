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
const PUNTOS_POR_100: Record<MembershipTier, number> = {
  [MembershipTier.NONE]:  0.5,
  [MembershipTier.GOLD]:  1,
  [MembershipTier.BLACK]: 2,
  [MembershipTier.ELITE]: 4,
}

const PESOS_POR_PUNTO = 0.50
const MAX_CANJE_PCT   = 0.20
const SERVICE_FEE     = 175

// ─── Helpers internos ─────────────────────────────────────────────────────────
function calcularPuntosGanados(subtotalMercancia: number, tier: MembershipTier): number {
  return Math.floor((subtotalMercancia / 100) * PUNTOS_POR_100[tier] * 10) / 10
}

function calcularDescuentoPuntos(puntos: number): number {
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
    
    // 1. Asignar valores por defecto para evitar crashes por undefined
    const {
      customer = {},
      amount = 0,
      description = "Compra",
      items = [],
      puntosUsados: puntosUsadosRaw = 0,
      metadata = {},
    } = body

    // 2. Validación temprana
    if (!items.length || !customer.email) {
      return NextResponse.json(
        { success: false, error: "Datos de cliente o carrito faltantes o inválidos." },
        { status: 400 }
      )
    }

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

    const puntosDisponibles  = dbUser?.points ?? 0
    const puntosRequeridos   = dbUser ? Math.max(0, Math.floor(Number(puntosUsadosRaw))) : 0
    const limiteMax          = maxCanjeable(puntosDisponibles, amount)
    const puntosConfirmados  = Math.min(puntosRequeridos, limiteMax)
    const descuentoPuntosMXN = calcularDescuentoPuntos(puntosConfirmados)

    const realServiceFee = isElite ? 0 : SERVICE_FEE

    const subtotalMercancia = items.reduce(
      (sum: number, item: any) => sum + Number(item.price || 0) * Number(item.quantity || 1),
      0
    )

    const puntosGanados = calcularPuntosGanados(subtotalMercancia, tier)
    const totalCobrado = Math.max(100, amount)

    const colocacionesTotal     = getColocacionesGratis(tier)
    const colocacionesUsadas    = dbUser?.membershipColocacionesUsadas ?? 0
    const colocacionesRestantes = Math.max(0, colocacionesTotal - colocacionesUsadas)
    const usaColocacionGratis   = colocacionesRestantes > 0

    const resolvedItems = await Promise.all(
      items.map(async (item: any) => {
        const candidateId = item.productId || item.id
        if (candidateId) {
          const found = await prisma.product.findUnique({
            where: { id: String(candidateId) }, select: { id: true }
          })
          if (found) return { ...item, resolvedProductId: found.id }
        }
        if (item.sku) {
          const bySku = await prisma.product.findUnique({
            where: { sku: String(item.sku) }, select: { id: true }
          })
          if (bySku) return { ...item, resolvedProductId: bySku.id }
        }
        return { ...item, resolvedProductId: null }
      })
    )

    // Formateo seguro de nombres y direcciones para no guardar "undefined"
    const fullName = [customer.name, customer.lastName].filter(Boolean).join(" ").trim() || "Cliente Invitado"
    const fullAddress = [customer.street, customer.number, customer.zip ? `CP ${customer.zip}` : null]
      .filter(Boolean)
      .join(", ")
      .trim()

    const newOrder = await prisma.order.create({
      data: {
        user: {
          connectOrCreate: {
            where:  { email: customer.email },
            create: {
              email:        customer.email,
              name:         fullName,
              password:     `guest_${Date.now()}`,
              phone:        customer.phone || null,
              street:       customer.street || null,
              neighborhood: customer.neighborhood || null,
              zipCode:      customer.zip || null,
              city:         customer.city || null,
              state:        customer.state || null,
            },
          },
        },
        total:         totalCobrado,
        subtotal:      subtotalMercancia,
        serviceFee:    realServiceFee,
        status:        "PENDING",
        paymentMethod: "stripe_custom",
        customerName:  fullName,
        customerEmail: customer.email,
        address:       fullAddress,
        items: {
          create: resolvedItems.map((item: any) => ({
            ...(item.resolvedProductId ? { product: { connect: { id: item.resolvedProductId } } } : {}),
            title:    item.title || "Producto sin nombre",
            price:    Number(item.price || 0),
            quantity: Number(item.quantity || 1),
            unit:     item.unit        || null,
            color:    item.meta?.color || null,
            sku:      item.sku         || null,
          })),
        },
      },
    })

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

    let stripeCustomerId: string
    if (dbUser?.stripeCustomerId) {
      stripeCustomerId = dbUser.stripeCustomerId
    } else {
      const existing = await stripe.customers.list({ email: customer.email, limit: 1 })
      if (existing.data.length > 0) {
        stripeCustomerId = existing.data[0].id
      } else {
        const newCustomer = await stripe.customers.create({
          email: customer.email, 
          name: fullName, 
          phone: customer.phone,
          metadata: { userId: dbUser?.id ?? "guest" },
        })
        stripeCustomerId = newCustomer.id
        if (dbUser) await prisma.user.update({ where: { id: dbUser.id }, data: { stripeCustomerId } })
      }
    }

    const amountCentavos = Math.round(totalCobrado * 100)
    if (amountCentavos < 10000) {
      return NextResponse.json(
        { success: false, error: `El monto mínimo para procesar un pago es $100 MXN. Total calculado: $${totalCobrado}` },
        { status: 400 }
      )
    }

    // Convertir y forzar toda metadata externa a strings
    const safeClientMetadata = Object.fromEntries(
      Object.entries(metadata).map(([k, v]) => [k, String(v)])
    )

    const paymentIntent = await stripe.paymentIntents.create({
      amount:        amountCentavos,
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
        ...safeClientMetadata, // Expandir primero evita que sobreescriban nuestra data interna
        order_id:           newOrder.id,
        user_id:            dbUser?.id  ?? "guest",
        tier,
        service_fee:        realServiceFee.toString(),
        puntos_usados:      puntosConfirmados.toString(),
        descuento_puntos:   descuentoPuntosMXN.toString(),
        puntos_ganados:     (Math.floor(puntosGanados * 10) / 10).toString(),
        colocacion_gratis:  usaColocacionGratis ? "YES" : "NO",
        canal:              "web_b2b",
      },
    })

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