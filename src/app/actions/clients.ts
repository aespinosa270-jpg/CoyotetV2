"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
    // 1. Separamos el ID del resto de los datos que vamos a guardar
    const { id, ...dataToSave } = input;

    // 2. Ejecutamos Update o Create
    const res = id 
      ? await prisma.user.update({ 
          where: { id }, 
          data: dataToSave 
        })
      : await prisma.user.create({ 
          data: { 
            ...dataToSave,
            // Inyectamos un password dummy obligatorio para que el schema de Prisma compile
            password: `coyote_${Math.random().toString(36).slice(-8)}` 
          } 
        });
    
    revalidatePath("/crm/admin/clientes");
    return { success: true, clientId: res.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}