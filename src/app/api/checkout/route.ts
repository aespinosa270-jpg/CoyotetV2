// 🔥 FIX: Obligamos a Vercel a no pre-renderizar este archivo en build-time
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // 🐺 Usamos la instancia global segura
import Stripe from 'stripe';

// 🐺 Inicializamos Stripe de forma segura
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer, amount, description, items, metadata } = body;

    if (!amount || !description || !items) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos en el payload.' },
        { status: 400 }
      );
    }

    const fullAddress = `${customer.street} ${customer.number} ${customer.unit ? 'Int ' + customer.unit : ''}, ${customer.neighborhood}, CP ${customer.zip}, ${customer.city}, ${customer.state}`;
    const dbLogisticsType = metadata.logistics_type === 'coyote' ? 'COYOTE_LOCAL' : 'SKYDROPX_NACIONAL';
    const subtotalCalc = amount - metadata.freight_cost - metadata.shipping_cost - metadata.service_fee - metadata.tax_iva;

    // 1. CREAR ORDEN EN PRISMA (ESTADO: PENDING)
    const newOrder = await prisma.order.create({
      data: {
        user: {
          connectOrCreate: {
            where: { email: customer.email },
            create: {
              email: customer.email,
              name: `${customer.name} ${customer.lastName}`.trim(),
              password: `guest_${Date.now()}`,
              phone: customer.phone,
              street: customer.street,
              neighborhood: customer.neighborhood,
              zipCode: customer.zip,
              city: customer.city,
              state: customer.state
            }
          }
        },
        subtotal: subtotalCalc,
        freightCost: metadata.freight_cost,
        shippingCost: metadata.shipping_cost,
        serviceFee: metadata.service_fee,
        taxIVA: metadata.tax_iva,
        total: amount,
        status: 'PENDING',
        paymentMethod: 'card',
        logisticsType: dbLogisticsType,
        vehiclesNeeded: metadata.vehicles_used,
        customerName: `${customer.name} ${customer.lastName}`.trim(),
        customerEmail: customer.email,
        customerPhone: customer.phone,
        address: fullAddress,
        wantsInvoice: metadata.req_invoice === 'YES',
        invoiceStatus: metadata.req_invoice === 'YES' ? 'PENDING' : null,
        items: {
          create: items.map((item: any) => ({
            productId: item.id || item.productId,
            title: item.title,
            price: Number(item.price),
            quantity: Number(item.quantity),
            unit: item.unit || 'Pieza',
            color: item.meta?.color ? String(item.meta.color) : null
          }))
        }
      }
    });

    console.log(`✅ Orden web creada: ${newOrder.id}. Solicitando Payment Intent a Stripe...`);

    const amountInCents = Math.round(amount * 100);

    // 2. SOLICITAR PAYMENT INTENT
    // 🔥 Dejamos que Stripe gestione automáticamente qué mostrar según tu Dashboard.
    // Ocultará OXXO por su cuenta si pasas de los $10,000 MXN y mostrará SPEI sin errores.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'mxn',
      description: description,
      receipt_email: customer.email,
      automatic_payment_methods: {
        enabled: true, 
      },
      metadata: {
        order_id: newOrder.id,
        req_invoice: metadata.req_invoice === 'YES' ? 'YES' : 'NO',
        fiscal_data: metadata.fiscal_data ? JSON.stringify(metadata.fiscal_data) : '',
        total_logistica: String(
          (metadata.freight_cost || 0) +
          (metadata.shipping_cost || 0) +
          (metadata.service_fee || 0)
        )
      }
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      orderId: newOrder.id,
      // Se lo seguimos mandando al frontend por si lo usas en algún texto, 
      // aunque Stripe ya hace el bloqueo duro.
      oxxoAvailable: amount <= 10000, 
    });

  } catch (error: any) {
    console.error('❌ Error en Checkout Web:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error procesando la transacción B2B' },
      { status: 500 }
    );
  }
}