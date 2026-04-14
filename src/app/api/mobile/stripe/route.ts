import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Inicializamos Stripe con la versión que exige tu SDK actual
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  // @ts-ignore: Esto evita que TS chille si la versión exacta cambia sutilmente
  apiVersion: '2026-02-25.clover', 
});

export async function POST(request: Request) {
  try {
    // 1. EL CADENERO: Validamos el token que viene de Flutter
    const authHeader = request.headers.get('authorization');
    if (authHeader !== 'Bearer token_secreto_super_seguro') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    // 2. RECIBIMOS EL MONTO (Viene en pesos desde Flutter)
    const { amount } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Monto inválido.' }, { status: 400 });
    }

    // 3. CONVERSIÓN: Stripe pide el monto en CENTAVOS (ej: $10.50 -> 1050)
    const amountInCents = Math.round(amount * 100);

    // 4. CREAMOS EL PAYMENT INTENT
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'mxn', // Pesos mexicanos
      automatic_payment_methods: { enabled: true },
    });

    // 5. RESPUESTA: Enviamos el clientSecret para que Flutter abra la pasarela
    return NextResponse.json(
      { clientSecret: paymentIntent.client_secret }, 
      { status: 200 }
    );

  } catch (error: any) {
    console.error('🚨 Error en Stripe API:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al procesar pago' }, 
      { status: 500 }
    );
  }
}