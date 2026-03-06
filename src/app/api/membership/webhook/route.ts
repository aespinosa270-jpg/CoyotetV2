import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import Stripe from "stripe"

// 🐺 Inicializamos Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
})

// 🔥 PRECIOS DINÁMICOS DESDE LAS VARIABLES DE ENTORNO (.env)
const STRIPE_PRICE_IDS: Record<string, { monthly: string; annual: string }> = {
  'GOLD':  { 
    monthly: process.env.STRIPE_PRICE_GOLD_MONTHLY!, 
    annual: process.env.STRIPE_PRICE_GOLD_ANNUAL! 
  },
  'BLACK': { 
    monthly: process.env.STRIPE_PRICE_BLACK_MONTHLY!, 
    annual: process.env.STRIPE_PRICE_BLACK_ANNUAL! 
  },
  'ELITE': { 
    monthly: process.env.STRIPE_PRICE_ELITE_MONTHLY!, 
    annual: process.env.STRIPE_PRICE_ELITE_ANNUAL! 
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return new NextResponse("Acceso denegado: Inicia sesión primero", { status: 401 })
  }

  try {
    const body = await req.json()
    // 🐺 Extraemos el plan y el ciclo de facturación que manda tu frontend
    const { planKey, billingCycle = 'monthly' } = body

    // Seleccionamos el precio exacto según el ciclo de facturación
    const priceId = STRIPE_PRICE_IDS[planKey]?.[billingCycle as 'monthly' | 'annual']
    
    if (!priceId) {
      console.error(`❌ Faltan los IDs de precio en el .env para ${planKey} - ${billingCycle}`);
      return new NextResponse("Plan o ciclo de facturación inválido o no configurado", { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return new NextResponse("Socio no encontrado", { status: 404 })

    // 1. OBTENER O CREAR CLIENTE EN STRIPE (Usando tu nueva Bóveda)
    let customerId = user.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || "Socio Comercial Coyote",
        metadata: { userId: user.id },
      })
      customerId = customer.id

      // Lo guardamos en el ADN del usuario para futuros cobros
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // 2. CREAR LA SUSCRIPCIÓN EN STRIPE (Estado: "Incompleta" hasta que el banco pase la tarjeta)
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'], // Extraemos la llave de cobro de la primera factura
      metadata: {
        userId: user.id,
        planKey: planKey,
        billingCycle: billingCycle, // Guardamos el dato por si lo necesitas auditar después
      },
    })

    // Extraemos el "Secreto" para el Frontend
    const invoice = subscription.latest_invoice as Stripe.Invoice
    // 🐺 AQUÍ ESTÁ LA MAGIA: Forzamos el tipo con (invoice as any) para que Vercel no llore
    const paymentIntent = (invoice as any).payment_intent as Stripe.PaymentIntent

    // 3. PRE-REGISTRAMOS LA SUSCRIPCIÓN EN POSTGRESQL
    // OJO: No le subimos el nivel (role/membershipTier) todavía. 
    // Eso lo hará el Webhook en cuanto Stripe confirme el pago.
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeSubscriptionId: subscription.id },
    })

    // 4. LE MANDAMOS LA LLAVE AL FRONTEND PARA RENDERIZAR LA TARJETA EN LA BÓVEDA
    return NextResponse.json({ 
      success: true, 
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id 
    })

  } catch (error: any) {
    console.error("🔥 Error de Transacción en Membresía:", error.message)
    return new NextResponse(error.message, { status: 500 })
  }
}