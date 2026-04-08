"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createTrace } from "@/lib/tracer";

export async function addInteractionAction(input: {
  userId: string;
  type: "LLAMADA" | "WHATSAPP" | "CORREO" | "PRESENCIAL";
  summary: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Acceso denegado");

    const agentId = session.user.id;
    const agentName = session.user.name || "Agente";

    // 1. Guardamos la interacción en el modelo oficial de Interaction
    const interaction = await prisma.interaction.create({
      data: {
        userId: input.userId,
        employeeId: agentId,
        type: input.type,
        summary: input.summary,
      }
    });

    // 2. 🕵️‍♂️ DEJAMOS EL RASTRO EN LA AUDITORÍA GLOBAL
    await createTrace({
      employeeId: agentId,
      actionName: "NEW_INTERACTION",
      summary: `${agentName} registró una ${input.type.toLowerCase()} con el cliente.`,
      content: { 
        interactionId: interaction.id,
        clientId: input.userId,
        detalle: input.summary 
      }
    });

    revalidatePath(`/crm/clientes/${input.userId}`);
    return { success: true };
  } catch (error: any) {
    console.error("❌ Error en addInteractionAction:", error);
    return { success: false, error: error.message };
  }
}