"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createTrace } from "@/lib/tracer";
import { TicketStatus } from "@prisma/client";

export async function updateTicketStatusAction(ticketId: string, newStatus: TicketStatus) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Acceso denegado");

    const agentId = session.user.id;
    const agentName = session.user.name || "Agente";

    // 1. Obtenemos el ticket actual para comparar (opcional, pero buena práctica)
    const currentTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { status: true, ticketNumber: true }
    });

    if (!currentTicket) throw new Error("Ticket no encontrado");

    // 2. Actualizamos el estado
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: newStatus }
    });

    // 3. 🕵️‍♂️ DEJAMOS EL RASTRO
    await createTrace({
      employeeId: agentId,
      actionName: "UPDATE_TICKET_STATUS",
      summary: `${agentName} cambió el ticket ${currentTicket.ticketNumber} de ${currentTicket.status} a ${newStatus}`,
      content: { 
        ticketId, 
        oldStatus: currentTicket.status, 
        newStatus 
      }
    });

    revalidatePath(`/crm/tickets`);
    revalidatePath(`/crm/tickets/${ticketId}`);
    return { success: true };
  } catch (error: any) {
    console.error("❌ Error en updateTicketStatusAction:", error);
    return { success: false, error: error.message };
  }
}