"use server"

import { prisma } from '@/lib/prisma'
import { PickupLocation, MovementType } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function registerMovementAction(formData: FormData) {
  try {
    const type = formData.get('type') as MovementType;
    const productId = formData.get('productId') as string;
    const colorId = formData.get('colorId') as string;
    const location = formData.get('location') as PickupLocation;
    const provider = formData.get('provider') as string;
    const authorizedBy = formData.get('authorizedBy') as string;
    const quantity = parseFloat(formData.get('quantity') as string);
    const rollCount = parseInt(formData.get('rollCount') as string);
    const notes = formData.get('notes') as string;

    // Usamos una Transacción de Prisma para asegurar que ambas cosas pasen juntas
    await prisma.$transaction(async (tx) => {
      
      // 1. Dejar el registro en el Kardex (Auditoría)
      await tx.inventoryMovement.create({
        data: {
          type, productId, colorId, location, provider, authorizedBy,
          quantity, rollCount, notes
        }
      });

      // 2. Actualizar el Stock Físico en la Bodega correspondiente
      const currentStock = await tx.inventory.findUnique({
        where: {
          productId_colorId_location: { productId, colorId, location }
        }
      });

      const multiplier = type === 'ENTRADA' ? 1 : -1;

      if (currentStock) {
        // Si ya hay mercancía, sumamos o restamos
        await tx.inventory.update({
          where: { id: currentStock.id },
          data: {
            quantity: currentStock.quantity + (quantity * multiplier),
            rollCount: currentStock.rollCount + (rollCount * multiplier)
          }
        });
      } else if (type === 'ENTRADA') {
        // Si no hay y es entrada, creamos el registro en esa sucursal
        await tx.inventory.create({
          data: {
            productId, colorId, location,
            quantity, rollCount
          }
        });
      } else {
        throw new Error("No puedes dar salida a un producto que no tiene stock registrado.");
      }
    });

    revalidatePath('/crm/admin/bodega');
    return { success: true };
  } catch (error: any) {
    console.error("Error en movimiento de inventario:", error);
    return { success: false, error: error.message || "Fallo crítico en el Kardex." };
  }
}

// Función auxiliar para cargar productos en el formulario
export async function getProductsForInventory() {
  return await prisma.product.findMany({
    include: { colors: true },
    where: { isActive: true }
  });
}