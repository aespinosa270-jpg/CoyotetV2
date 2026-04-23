"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { OrderStatus } from "@prisma/client";

export async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus }
    });

    revalidatePath("/crm/admin/pedidos");
    return { success: true };
  } catch (error) {
    return { success: false, error: "No se pudo actualizar el estado." };
  }
}