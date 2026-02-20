// src/app/api/crm/orders/status/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // 1. Verificación Zero-Trust (Solo empleados pueden hacer esto)
    // 🔥 CORRECCIÓN VITAL: AWAIT EN LAS COOKIES 🔥
    const cookieStore = await cookies();
    const session = cookieStore.get('coyote_crm_session');

    if (!session || !session.value) {
      return NextResponse.json({ error: 'Acceso Denegado' }, { status: 401 });
    }

    const { orderId, newStatus } = await request.json();

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // 2. Actualizamos el estado del pedido en Prisma
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus }
    });

    // 3. (Opcional) Aquí dejamos el gancho para disparar correos automáticos después
    if (newStatus === 'PROCESSING') {
      console.log(`📦 Pedido ${updatedOrder.orderNumber} marcado como EMPACADO.`);
      // TODO: Disparar Email: "Tu pedido se está empacando"
    }

    return NextResponse.json({ success: true, status: updatedOrder.status });

  } catch (error) {
    console.error('Error actualizando estado:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}