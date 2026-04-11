// src/app/crm/admin/tickets/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function assignTicket(ticketId: string, employeeId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "No autorizado" };

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { 
        employeeId: employeeId,
        status: "EN_REVISION" // Al asignar, pasa automáticamente a revisión
      }
    });

    revalidatePath('/crm/admin/tickets');
    return { success: true };
  } catch (error: any) {
    console.error("Error asignando ticket:", error.message);
    return { success: false, error: "Error al asignar el ticket." };
  }
}

export async function resolveTicketAdmin(ticketId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "No autorizado" };

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "RESUELTO" }
    });

    revalidatePath('/crm/admin/tickets');
    return { success: true };
  } catch (error: any) {
    console.error("Error resolviendo ticket:", error.message);
    return { success: false, error: "Error al resolver en la base de datos." };
  }
}