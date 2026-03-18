// src/app/api/financing/initiate/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, provider, amount } = body;

    if (!orderId || !provider || !amount) {
      return NextResponse.json(
        { success: false, error: "Faltan datos requeridos (orderId, provider, amount)." },
        { status: 400 }
      );
    }

    // ====================================================================
    // 💳 APLAZO
    // ====================================================================
    if (provider === 'aplazo') {
      // Tomamos el Merchant ID de tus variables de entorno
      const merchantId = process.env.NEXT_PUBLIC_APLAZO_MERCHANT_ID || 'TEST_MERCHANT_ID';
      
      // Construimos la URL oficial de redirección para Aplazo
      const checkoutUrl = `https://checkout.aplazo.mx/checkout?total=${amount}&order_id=${orderId}&merchant_id=${merchantId}`;
      
      // Devolvemos el JSON limpio que el frontend está esperando
      return NextResponse.json({ success: true, checkoutUrl });
    }

    // ====================================================================
    // 🏦 KAPITAL
    // ====================================================================
    if (provider === 'kapital') {
      const merchantId = process.env.NEXT_PUBLIC_KAPITAL_MERCHANT_ID || 'TEST_MERCHANT_ID';
      const checkoutUrl = `https://app.kapital.mx/checkout?amount=${amount}&order_id=${orderId}&merchant=${merchantId}`;
      
      return NextResponse.json({ success: true, checkoutUrl });
    }

    return NextResponse.json(
      { success: false, error: "Proveedor de financiamiento no soportado." },
      { status: 400 }
    );

  } catch (error) {
    console.error("🔥 Error en la API de Financiamiento:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor al procesar el financiamiento." },
      { status: 500 }
    );
  }
}