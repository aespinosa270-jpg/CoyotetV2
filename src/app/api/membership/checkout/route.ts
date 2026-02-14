import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// TUS IDS REALES DE OPENPAY
const OPENPAY_PLANS: Record<string, string> = {
  'GOLD': 'phlugox3vwsbvbsi1nxf',
  'BLACK': 'pkkvsgtvhz2hk8xyqtnp',
  'ELITE': 'p83a2hxbhkfdqkpouz0h'
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return new NextResponse("Acceso denegado: Inicia sesión primero", { status: 401 })
  }

  try {
    const body = await req.json()
    // Ahora el frontend nos debe mandar el Token encriptado de la tarjeta
    const { planKey, tokenId, deviceSessionId } = body

    const planId = OPENPAY_PLANS[planKey]
    if (!planId) return new NextResponse("Plan B2B inválido", { status: 400 })

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return new NextResponse("Socio no encontrado", { status: 404 })

    // CONFIGURACIÓN DE SEGURIDAD OPENPAY (Variables de Entorno)
    const OPENPAY_MERCHANT = process.env.OPENPAY_MERCHANT_ID!
    const OPENPAY_PRIVATE_KEY = process.env.OPENPAY_PRIVATE_KEY!
    
    // NOTA: Usamos sandbox para pruebas. Cuando salgas a producción, quita la palabra "sandbox-"
    const baseUrl = "https://sandbox-api.openpay.mx/v1" 
    const authHeader = `Basic ${Buffer.from(`${OPENPAY_PRIVATE_KEY}:`).toString('base64')}`

    // 1. CREAR CLIENTE EN OPENPAY (Para poder suscribirlo)
    const customerRes = await fetch(`${baseUrl}/${OPENPAY_MERCHANT}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify({
        name: user.name || "Socio Comercial",
        email: user.email,
        requires_account: false
      })
    })
    const customer = await customerRes.json()
    if (customer.error_code) throw new Error(`OpenPay (Cliente): ${customer.description}`)

    // 2. CREAR LA SUSCRIPCIÓN CON TU ID Y EL TOKEN DE LA TARJETA
    const subRes = await fetch(`${baseUrl}/${OPENPAY_MERCHANT}/customers/${customer.id}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify({
        plan_id: planId,
        source_id: tokenId, // El token generado en el frontend
        device_session_id: deviceSessionId
      })
    })
    const subscription = await subRes.json()
    if (subscription.error_code) throw new Error(`OpenPay (Pago): ${subscription.description}`)

    // 3. SI EL BANCO APRUEBA, REGISTRAMOS EN POSTGRESQL
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        total: subscription.amount || 0, // El monto real cobrado
        status: "paid",
        paymentId: subscription.id, // ID de la transacción bancaria
        customerName: user.name || "Socio Comercial",
        customerEmail: user.email,
      }
    })

    // 4. ASCENDEMOS DE RANGO AL USUARIO EN EL SISTEMA
    await prisma.user.update({
      where: { id: user.id },
      data: { role: planKey.toLowerCase() }
    })

    return NextResponse.json({ success: true, orderId: order.id })

  } catch (error: any) {
    console.error("🔥 Error de Transacción:", error.message)
    return new NextResponse(error.message, { status: 500 })
  }
}