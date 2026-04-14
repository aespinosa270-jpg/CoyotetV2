import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// OJO: Asegúrate de tener STRIPE_SECRET_KEY (sk_test_...) en tu archivo .env
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_tu_clave_aqui', {
  apiVersion: '2023-10-16', // Usa la versión más reciente que te deje
});

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== 'Bearer token_secreto_super_seguro') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { amount } = await request.json();

    // Stripe cobra en CENTAVOS. Si son $100 pesos, Stripe pide 10000.
    const amountInCents = Math.round(amount * 100);

    // Creamos la intención de cobro
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'mxn', // Pesos mexicanos
      automatic_payment_methods: { enabled: true },
    });

    // Le regresamos el "Secreto" al celular
    return NextResponse.json({ clientSecret: paymentIntent.client_secret }, { status: 200 });

  } catch (error: any) {
    console.error('Error de Stripe:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}