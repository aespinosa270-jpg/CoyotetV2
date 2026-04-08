"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth"; // 🔥 Importamos NextAuth
import { createTrace } from "@/lib/tracer"; // 🔥 Importamos tu Tracer

export async function getClientsWithStats() {
  try {
    const clients = await prisma.user.findMany({
      include: {
        deals: {
          where: { status: "CERRADO_GANADO" },
          select: { value: true }
        }
      },
      orderBy: { name: "asc" }
    });

    return clients.map(client => ({
      ...client,
      totalSpent: client.deals.reduce((acc, d) => acc + Number(d.value), 0),
      ordersCount: client.deals.length,
      lastActivity: client.updatedAt.toISOString()
    }));
  } catch (err) {
    console.error("[getClientsWithStats]", err);
    return [];
  }
}

export async function upsertClientAction(input: {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  company?: string;
}) {
  try {
    // 1. 🛡️ Barrera de seguridad Zero-Trust: ¿Quién carajos está haciendo esto?
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Acceso denegado: Sesión de agente no válida.");
    }

    const agentId = session.user.id;
    const agentName = session.user.name || "Agente";

    // 2. Separamos el ID del resto de los datos
    const { id, ...dataToSave } = input;
    const isUpdate = !!id; // Bandera para saber qué estamos haciendo

    // 3. Ejecutamos Update o Create
    const res = id 
      ? await prisma.user.update({ 
          where: { id }, 
          data: dataToSave 
        })
      : await prisma.user.create({ 
          data: { 
            ...dataToSave,
            // Password dummy obligatorio
            password: `coyote_${Math.random().toString(36).slice(-8)}` 
          } 
        });
    
    // 4. 🕵️‍♂️ DEJAMOS EL RASTRO TATUADO EN LA BASE DE DATOS
    await createTrace({
      employeeId: agentId,
      actionName: isUpdate ? "UPDATE_CLIENT_PROFILE" : "CREATE_CLIENT",
      summary: `${agentName} ${isUpdate ? "actualizó el perfil de" : "registró al cliente"} ${res.name || res.email}`,
      content: { 
        clientId: res.id, 
        cambios: dataToSave // Metemos al JSON exactamente qué datos introdujo
      }
    });

    revalidatePath("/crm/admin/clientes");
    return { success: true, clientId: res.id };
  } catch (error: any) {
    console.error("❌ Error en upsertClientAction:", error);
    return { success: false, error: error.message };
  }
}