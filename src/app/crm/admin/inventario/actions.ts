"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// 1. OBTENER EL INVENTARIO GLOBAL (Para poblar el grid de tarjetas)
export async function getInventory() {
  try {
    // Traemos los registros de inventario incluyendo los detalles del producto y color
    const inventoryRecords = await prisma.inventory.findMany({
      include: {
        product: true,
        color: true,
      },
      orderBy: {
        product: { title: 'asc' }
      }
    });

    // Lo formateamos para que el Client Component lo digiera fácilmente
    const formattedData = inventoryRecords.map(record => ({
      id: record.id, // El ID ahora es el del registro de Inventory, no del Product
      productId: record.productId,
      sku: record.product.sku,
      // Concatenamos el color al nombre si es que tiene variante
      name: record.product.title + (record.color ? ` - ${record.color.name}` : ''),
      location: record.location,
      stock: Number(record.quantity), // Para las sumas/restas de los botones + y -
      unit: record.product.unit,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return { success: false, error: "Error al cargar el inventario desde la base de datos." };
  }
}

// 2. AJUSTE RÁPIDO DESDE EL GRID (Botones + y -)
export async function adjustStock(inventoryId: string, quantityChange: number, reason: string) {
  try {
    // ⚠️ ALAN: Aquí va tu auth real. Usamos un "Admin" por defecto para que funcione ahora.
    // const session = await auth(); 
    // if (!session?.user?.id) return { success: false, error: "No autorizado" };
    const authorizedByName = "Admin Rápido"; 

    await prisma.$transaction(async (tx) => {
      // 1. Buscar el registro de inventario específico
      const currentInventory = await tx.inventory.findUnique({ 
        where: { id: inventoryId },
        include: { product: true }
      });
      
      if (!currentInventory) throw new Error("Registro de inventario no encontrado.");

      const newStock = currentInventory.quantity + quantityChange;
      if (newStock < 0) throw new Error("El stock físico no puede ser negativo.");

      // 2. Actualizar la cantidad
      await tx.inventory.update({
        where: { id: inventoryId },
        data: { quantity: newStock }
      });

      // 3. Registrar el movimiento en el Kardex para auditoría
      await tx.inventoryMovement.create({
        data: {
          productId: currentInventory.productId,
          colorId: currentInventory.colorId,
          location: currentInventory.location,
          type: quantityChange > 0 ? "ENTRADA" : "SALIDA",
          quantity: Math.abs(quantityChange), // Siempre positivo para el log
          rollCount: 0, // Asumimos 0 rollos en un ajuste rápido de piezas/kg
          authorizedBy: authorizedByName,
          notes: `Ajuste rápido en panel: ${reason}`
        }
      });
    });

    revalidatePath('/crm/admin/inventario');
    return { success: true };
  } catch (error: any) {
    console.error("🚨 Error adjustStock:", error);
    return { success: false, error: error.message || "Error al realizar el ajuste." };
  }
}