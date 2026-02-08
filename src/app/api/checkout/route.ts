// src/app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import Openpay from 'openpay';
import { prisma } from '@/lib/prisma'; // Importamos la DB

// Inicializar OpenPay
const openpay = new Openpay(
  process.env.OPENPAY_MERCHANT_ID!,
  process.env.OPENPAY_PRIVATE_KEY!,
  process.env.OPENPAY_PRODUCTION === 'true'
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Agregamos 'items' y 'shippingAddress' al destructuring
    const { token, deviceSessionId, customer, amount, description, items } = body;

    // 1. Validación básica
    if (!token || !amount || !description || !items) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos (token, monto, items)' },
        { status: 400 }
      );
    }

    // 2. Objeto de cargo para OpenPay
    const chargeRequest = {
      source_id: token,
      method: 'card',
      amount: parseFloat(amount),
      currency: 'MXN',
      description: description,
      device_session_id: deviceSessionId,
      customer: {
        name: customer.name,
        last_name: customer.lastName || '',
        phone_number: customer.phone,
        email: customer.email,
      }
    };

    // 3. Procesar el cargo (OpenPay)
    const charge: any = await new Promise((resolve, reject) => {
      openpay.charges.create(chargeRequest, (error: any, charge: any) => {
        if (error) reject(error);
        else resolve(charge);
      });
    });

    // ---------------------------------------------------------
    // 4. SI EL PAGO PASÓ: GUARDAR ORDEN EN BASE DE DATOS
    // ---------------------------------------------------------
    
    const newOrder = await prisma.order.create({
      data: {
        total: parseFloat(amount),
        status: 'paid',         // Ya está pagada
        paymentId: charge.id,   // Guardamos el ID de OpenPay para aclaraciones
        customerName: `${customer.name} ${customer.lastName}`,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        address: customer.address || 'Dirección pendiente', // Asegúrate de mandar esto desde el front
        
        // Guardamos los productos comprados
        items: {
          create: items.map((item: any) => ({
            productId: item.productId || item.id, // Manejo flexible del ID
            title: item.title,
            quantity: Number(item.quantity),      // Aseguramos que sea número
            price: Number(item.price),
            unit: item.unit || 'Pieza'
          }))
        }
      }
    });

    // Retornamos éxito y el ID de la orden interna
    return NextResponse.json({ success: true, charge, orderId: newOrder.id });

  } catch (error: any) {
    console.error('Error en Checkout:', error);
    
    // Manejo de errores específicos de OpenPay
    const errorCode = error.error_code || 500;
    const errorMessage = error.description || 'Error procesando el pago';

    return NextResponse.json(
      { success: false, error: errorMessage, code: errorCode },
      { status: 400 }
    );
  }
}