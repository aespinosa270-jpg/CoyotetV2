// src/app/api/checkout/route.ts

// 🔥 FIX: Blindaje total para el build de Vercel
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer, amount, description, items, metadata } = body;

    // 1. CREAR ORDEN EN PRISMA (Para el CRM de Huup)
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
        total: amount,
        status: 'PENDING',
        paymentMethod: 'stripe_custom',
        customerName: `${customer.name} ${customer.lastName}`.trim(),
        customerEmail: customer.email,
        address: `${customer.street}, CP ${customer.zip}`,
        items: {
          create: items.map((item: any) => ({
            productId: item.id || item.productId,
            title: item.title,
            price: Number(item.price),
            quantity: Number(item.quantity),
          }))
        }
      }
    });

    // 2. CONFIGURAR PASARELA (SOLO FINANCIERAS APROBADAS)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'mxn',
      description: description,
      receipt_email: customer.email,
      
      // 🐺 FILTRO DE MÉTODOS: Aquí es donde mandamos a los demás alv.
      // 'customer_balance' es el canal para que Kapital Bank transfiera vía SPEI.
      // 'aplazo' es tu BNPL aprobado.
      payment_method_types: [
        'card',             // Tarjetas (Kapital, Nu, Banamex, etc.)
        'customer_balance', // 🔥 SPEI Directo (Ideal para B2B con Kapital Bank)
        'aplazo',           // 🔥 BNPL Autorizado
        'oxxo'              // Solo para compras < 10k
      ],
      
      payment_method_options: {
        customer_balance: {
          funding_type: 'bank_transfer',
          bank_transfer: { type: 'mx_bank_transfer' },
        },
      },

      metadata: {
        order_id: newOrder.id,
        canal: 'web_b2b',
        socio: 'Coyote Textil'
      }
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      orderId: newOrder.id
    });

  } catch (error: any) {
    console.error('❌ Error Checkout:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}