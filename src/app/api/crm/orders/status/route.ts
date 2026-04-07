import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { cookies } from 'next/headers';
import { createTrace } from "@/lib/tracer"; 

export async function POST(request: Request) {
  try {
    // 1. Verificación Zero-Trust
    const cookieStore = await cookies();
    const session = cookieStore.get('coyote_crm_session');

    if (!session || !session.value) {
      return NextResponse.json({ error: 'Acceso Denegado' }, { status: 401 });
    }

    const { orderId, newStatus } = await request.json();

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // 2. Actualizamos el estado del pedido y traemos los datos del cliente
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
      include: { user: true }
    });

    // 3. Buscamos qué agente está atendiendo a este cliente (en su Deal activo)
    let assignedAgentId = undefined;
    
    // Solo buscamos si la orden tiene un usuario real asignado
    if (updatedOrder.userId) {
      const deal = await prisma.deal.findFirst({
        where: { userId: updatedOrder.userId },
        select: { employeeId: true }
      });
      assignedAgentId = deal?.employeeId;
    }

    // =========================================================================
    // 🎫 DISPARADOR AUTOMÁTICO DE TICKETS
    // =========================================================================
    
    // Si el pedido se marca como PAGADO o CONFIRMADO
    if (newStatus === 'PAID' || newStatus === 'CONFIRMED' || newStatus === 'PAGADO') {
      
      // 🔥 ESCUDO ANTI-EXPLOSIONES: Si la orden no tiene usuario, no podemos crear el ticket
      if (!updatedOrder.userId) {
        console.warn(`⚠️ Pedido #${updatedOrder.orderNumber} no tiene cliente. Saltando creación de ticket.`);
      } else {
        const ticketNum = `TK-ORD-${updatedOrder.orderNumber || Date.now().toString().slice(-5)}`;
        
        try {
          const nuevoTicket = await prisma.ticket.create({
            data: {
              ticketNumber: ticketNum,
              subject: `📦 PREPARAR PEDIDO #${updatedOrder.orderNumber}`,
              description: `Automatización: El pedido ha sido confirmado. \nAcción: Verificar stock, empacar y asignar a ruta de entrega para ${updatedOrder.user?.name || 'Cliente'}.`,
              priority: "ALTA",
              status: "ABIERTO",
              orderId: updatedOrder.id,
              
              // 🔥 FIX DEFINITIVO: Como ya verificamos arriba que NO es null, lo forzamos como string
              userId: updatedOrder.userId as string, 
              
              // Solo lo asignamos al agente si existe
              ...(assignedAgentId ? { employeeId: assignedAgentId } : {}) 
            }
          });

          // 🕵️‍♂️ DEJAR RASTRO EN INTERACCIONES (Tracer)
          await createTrace({
            employeeId: assignedAgentId || "SISTEMA", 
            phone: updatedOrder.user?.phone || "SISTEMA",
            type: "PRESENCIAL",
            summary: `🎫 Ticket generado automáticamente: ${ticketNum} por confirmación de pedido.`,
            content: { orderId: updatedOrder.id, ticketId: nuevoTicket.id },
            actionName: "AUTO_TICKET_PEDIDO"
          });

          console.log(`✅ Ticket ${ticketNum} creado correctamente.`);
        } catch (ticketError) {
          console.error("⚠️ Error creando el ticket automático:", ticketError);
        }
      }
    }

    // Lógica para otros estados (Opcional)
    if (newStatus === 'PROCESSING') {
      console.log(`📦 Pedido ${updatedOrder.orderNumber} en proceso de empaque.`);
    }

    return NextResponse.json({ 
      success: true, 
      status: updatedOrder.status,
      message: "Estado actualizado e inteligencia disparada" 
    });

  } catch (error: any) {
    console.error('❌ Error actualizando estado:', error);
    return NextResponse.json({ error: 'Error interno del servidor', detalle: error.message }, { status: 500 });
  }
}