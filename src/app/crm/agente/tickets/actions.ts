// src/app/crm/agente/tickets/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function resolveTicket(ticketId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "No autorizado" };

    await prisma.ticket.update({
      where: { 
        id: ticketId,
        employeeId: session.user.id // Auditoría dura: No puede cerrar un ticket que no es suyo
      },
      data: { status: "RESUELTO" }
    });

    revalidatePath('/crm/agente/tickets');
    return { success: true };
  } catch (error) {
    console.error("Error resolviendo ticket:", error);
    return { success: false, error: "Error al cerrar el caso." };
  }
}