// src/app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import Openpay from 'openpay';

// Inicializar OpenPay
const openpay = new Openpay(
  process.env.OPENPAY_MERCHANT_ID!,
  process.env.OPENPAY_PRIVATE_KEY!,
  process.env.OPENPAY_PRODUCTION === 'true'
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, deviceSessionId, customer, amount, description } = body;

    // Validación básica
    if (!token || !amount || !description) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos (token, monto, descripción)' },
        { status: 400 }
      );
    }

    // Objeto de cargo para OpenPay
    const chargeRequest = {
      source_id: token,
      method: 'card',
      amount: parseFloat(amount),
      currency: 'MXN',
      description: description,
      device_session_id: deviceSessionId, // Anti-fraude vital
      customer: {
        name: customer.name,
        last_name: customer.lastName || '',
        phone_number: customer.phone,
        email: customer.email,
      }
    };

    // Promesa para procesar el cargo (OpenPay usa callbacks, lo convertimos a promesa)
    const charge = await new Promise((resolve, reject) => {
      openpay.charges.create(chargeRequest, (error: any, charge: any) => {
        if (error) reject(error);
        else resolve(charge);
      });
    });

    return NextResponse.json({ success: true, charge });

  } catch (error: any) {
    console.error('Error en OpenPay:', error);
    
    // Manejo de errores específicos de OpenPay
    const errorCode = error.error_code || 500;
    const errorMessage = error.description || 'Error procesando el pago';

    return NextResponse.json(
      { success: false, error: errorMessage, code: errorCode },
      { status: 400 } // Usamos 400 para errores de lógica de negocio (tarjeta rechazada, etc.)
    );
  }
}