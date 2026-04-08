"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createTrace } from "@/lib/tracer";
import { PipelineStatus } from "@prisma/client";

export async function updateDealStatusAction(dealId: string, newStatus: PipelineStatus) {
  try {
    // 1. 🛡️ Seguridad Zero-Trust
    const session = await auth();
    if (!session?.user?.id) throw new Error("Acceso denegado");

    const agentId = session.user.id;
    const agentName = session.user.name || "Agente";

    // 2. Traemos el trato original para ver de quién es y cuánto vale
    const currentDeal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: { employee: true } // Traemos al dueño del deal para saber su % de comisión
    });

    if (!currentDeal) throw new Error("Trato no encontrado");

    // 3. Actualizamos el estado del Deal
    await prisma.deal.update({
      where: { id: dealId },
      data: { status: newStatus }
    });

    // ====================================================================
    // 💰 LA MÁQUINA DE DINERO: Lógica Automática de Comisiones
    // ====================================================================
    let commissionMsg = "";

    // Si apenas se está ganando el trato (y antes no estaba ganado)
    if (newStatus === "CERRADO_GANADO" && currentDeal.status !== "CERRADO_GANADO") {
      const rate = currentDeal.employee.commissionRate; // ej. 0.03 (3%)
      const amount = currentDeal.value * rate;

      // Upsert: Si ya existía una comisión (por si se regresó por error), la actualiza. Si no, la crea.
      await prisma.commission.upsert({
        where: { dealId: currentDeal.id },
        update: {
          amount: amount,
          rate: rate,
          status: "PENDIENTE" // Regresa a pendiente de pago
        },
        create: {
          employeeId: currentDeal.employeeId,
          dealId: currentDeal.id,
          amount: amount,
          rate: rate,
          status: "PENDIENTE"
        }
      });
      commissionMsg = ` 💰 Se generó una comisión de $${amount} (${rate * 100}%).`;
    } 
    // CTO Tip: Si el trato se echa para atrás, rechazamos la comisión automática
    else if (currentDeal.status === "CERRADO_GANADO" && newStatus !== "CERRADO_GANADO") {
      await prisma.commission.updateMany({
        where: { dealId: currentDeal.id, status: "PENDIENTE" },
        data: { status: "RECHAZADA", notes: "El trato se regresó de CERRADO_GANADO." }
      });
      commissionMsg = ` 📉 Se canceló la comisión pendiente.`;
    }

    // ====================================================================
    // 🕵️‍♂️ EL GRAN HERMANO: Rastro de Auditoría
    // ====================================================================
    await createTrace({
      employeeId: agentId,
      actionName: "UPDATE_PIPELINE_STATUS",
      summary: `${agentName} movió el trato "${currentDeal.title}" a ${newStatus}.${commissionMsg}`,
      content: { 
        dealId, 
        oldStatus: currentDeal.status, 
        newStatus,
        dealValue: currentDeal.value 
      }
    });

    // 4. Refrescamos la vista del Kanban
    revalidatePath(`/crm/ventas`);
    return { success: true };

  } catch (error: any) {
    console.error("❌ Error en updateDealStatusAction:", error);
    return { success: false, error: error.message };
  }
}