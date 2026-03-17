// app/api/stripe/intent/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Inicializamos Stripe con tu llave secreta (VIVE EN VERCEL, NO EN LA APP)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
});

export async function POST(req: Request) {
  try {
    const { amount, customerEmail } = await req.json();

    // 1. Crear el Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe usa centavos (MXN * 100)
      currency: 'mxn',
      receipt_email: customerEmail,
      automatic_payment_methods: { enabled: true },
    });

    // 2. Devolvemos solo el clientSecret a la App de Expo
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
    
  } catch (error: any) {
    console.error('❌ Error en Stripe Intent:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}