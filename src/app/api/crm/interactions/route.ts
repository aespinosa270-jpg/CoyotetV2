// src/app/api/crm/interactions/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, type, summary, pipelineStatus, nextFollowUp } = body;

    // Verificamos quién es el empleado que está guardando la nota
    const cookieStore = await cookies();
    const employeeId = cookieStore.get('coyote_crm_session')?.value;

    if (!employeeId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 401 });
    }

    // Guardamos la interacción en la Bóveda
    const interaction = await prisma.interaction.create({
      data: {
        employeeId,
        userId,
        type,            // LLAMADA, WHATSAPP, CORREO, PRESENCIAL
        summary,         // "Me dijo que le marcara el martes para cerrar la venta"
        pipelineStatus,  // PROSPECTO, COTIZANDO, NEGOCIACION...
        nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
      },
    });

    return NextResponse.json({ success: true, interaction });

  } catch (error) {
    console.error('[CRM Interacciones] Error:', error);
    return NextResponse.json(
      { error: 'Error interno guardando la interacción' },
      { status: 500 }
    );
  }
}