import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, transaction } = body;

    console.log(`🔔 Webhook Recibido: ${type}`);

    // 1. Verificación inicial (OpenPay a veces manda esto para probar)
    if (type === 'verification') {
      return NextResponse.json({ status: 'ok' });
    }

    // 2. Si el pago fue exitoso
    if (type === 'charge.succeeded') {
      const openPayId = transaction.id; // ID de transacción de OpenPay (ej. trns_...)
      const orderId = transaction.order_id; // ID de TU orden (si se envió)

      console.log(`💰 Pago exitoso detectado. OpenPay ID: ${openPayId}`);

      // Actualizamos la orden en la base de datos a "PAID"
      // NOTA: Aquí buscamos por el ID que guardaste en el checkout
      // Si usaste el ID de OpenPay para guardar la referencia, usa 'where: { paymentId: openPayId }'
      // Si usaste tu propio ID, usa 'where: { id: orderId }'
      
      /* 👇 DESCOMENTA ESTO CUANDO TENGAS TU PRISMA SCHEMA LISTO PARA ACTUALIZAR
         
      await prisma.order.update({
        where: { id: orderId }, 
        data: { 
          status: 'PAID',
          paymentId: openPayId,
          updatedAt: new Date()
        }
      });
      */
    }

    // 3. Responder rápido con 200 OK (Obligatorio para que OpenPay no reintente)
    return NextResponse.json({ status: 'ok' }, { status: 200 });

  } catch (error) {
    console.error('❌ Error en Webhook:', error);
    return NextResponse.json({ error: 'Webhook Error' }, { status: 500 });
  }
}