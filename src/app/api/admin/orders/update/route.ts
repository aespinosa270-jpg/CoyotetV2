// src/app/api/admin/orders/update/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

const ADMIN_EMAILS = [
  "jackrizk@coyotetextil.com",
  "stephanyrizk@coyotetextil.com",
];

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Cadenero de seguridad interno
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Acceso denegado. Solo lobos alfa.' }, { status: 403 });
    }

    const { orderId, status, trackingUrl } = await req.json();

    // Actualizamos la orden
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        trackingUrl: trackingUrl || null
      }
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error("🔥 Error actualizando orden:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}