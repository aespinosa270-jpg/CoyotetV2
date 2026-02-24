// src/app/api/webhooks/skydropx/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    console.log('\n======================================================');
    console.log('🚚 ALERTA DE LOGÍSTICA SKYDROPX:');
    console.log(`Evento: ${body?.event || 'Desconocido'}`);
    console.log('======================================================\n');

    // SkydropX manda eventos como 'shipment.updated' o 'tracking.updated'
    const trackingNumber = body?.data?.attributes?.tracking_number || body?.data?.tracking_number;
    const skydropxStatus = body?.data?.attributes?.status || body?.data?.status; 

    // Si viene con número de guía y un estado, actualizamos la Bóveda
    if (trackingNumber && skydropxStatus) {
      let nuevoEstado: OrderStatus | null = null;

      // Mapeamos los estados de SkydropX a tus estados de Prisma
      if (['en_transito', 'recolectado'].includes(skydropxStatus.toLowerCase())) {
        nuevoEstado = OrderStatus.SHIPPED;
      } else if (['entregado'].includes(skydropxStatus.toLowerCase())) {
        nuevoEstado = OrderStatus.DELIVERED;
      }

      if (nuevoEstado) {
        // Buscamos la orden que tenga esta guía y la actualizamos
        const ordenActualizada = await prisma.order.updateMany({
          where: { trackingNumber: trackingNumber },
          data: { status: nuevoEstado }
        });

        if (ordenActualizada.count > 0) {
           console.log(`✅ ¡Éxito! Orden con guía ${trackingNumber} movida a ${nuevoEstado}`);
        }
      }
    }

    // Le decimos a SkydropX "recibido, gracias" para que no vuelva a mandar el mismo mensaje
    return NextResponse.json({ status: 'ok', received: true });

  } catch (error) {
    console.error('❌ Error procesando Webhook de SkydropX:', error);
    return NextResponse.json({ error: 'Error procesando webhook' }, { status: 400 });
  }
}

// SkydropX a veces hace un ping GET para verificar si el servidor está vivo
export async function GET() {
    return new NextResponse('🐺 SkydropX Webhook Activo y a la escucha.', { status: 200 });
}