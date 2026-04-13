"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { MovementType, PickupLocation } from "@prisma/client";

export async function getProductsWithColors() {
  return await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      sku: true,
      title: true,
      unit: true,
      colors: {
        select: {
          id: true,
          name: true,
          hex: true,
        }
      }
    },
    orderBy: { title: 'asc' }
  });
}

type MovementData = {
  type: MovementType;
  productId: string;
  colorId?: string;
  location: PickupLocation;
  quantity: number;
  rollCount: number;
  provider?: string;
  authorizedBy: string;
  notes?: string;
};

export async function registerMovementAction(data: MovementData) {
  try {
    // Validaciones básicas de negocio
    if (data.quantity < 0) {
      return { success: false, error: "La cantidad no puede ser negativa." };
    }
    if (data.type !== "AJUSTE" && data.quantity === 0) {
      return { success: false, error: "La cantidad debe ser mayor a 0 para Entradas o Salidas." };
    }

    // Ejecutamos todo dentro de una transacción para garantizar integridad de datos (ACID)
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Buscamos si ya existe el producto en esa sucursal (y ese color, si aplica)
      const currentInventory = await tx.inventory.findFirst({
        where: {
          productId: data.productId,
          colorId: data.colorId || null,
          location: data.location,
        }
      });

      let newQty = data.quantity;
      let newRolls = data.rollCount;

      if (currentInventory) {
        // Lógica de cálculo según el tipo de movimiento
        if (data.type === "SALIDA") {
          newQty = currentInventory.quantity - data.quantity;
          newRolls = currentInventory.rollCount - data.rollCount;
          
          if (newQty < 0) throw new Error(`Stock insuficiente. Stock actual: ${currentInventory.quantity}`);
          if (newRolls < 0) throw new Error(`Rollos insuficientes. Rollos actuales: ${currentInventory.rollCount}`);
          
        } else if (data.type === "ENTRADA") {
          newQty = currentInventory.quantity + data.quantity;
          newRolls = currentInventory.rollCount + data.rollCount;
          
        } else if (data.type === "AJUSTE") {
          // El AJUSTE sobreescribe el valor absoluto (Conteos físicos de auditoría)
          newQty = data.quantity;
          newRolls = data.rollCount;
        }

        // Actualizamos el registro existente
        await tx.inventory.update({
          where: { id: currentInventory.id },
          data: { 
            quantity: newQty, 
            rollCount: newRolls 
          }
        });
      } else {
        // Si no existe, no puede haber una salida
        if (data.type === "SALIDA") {
          throw new Error("No se puede registrar una salida de un producto que no tiene existencias en esta sucursal.");
        }
        
        // Creamos el registro inicial para esta sucursal
        await tx.inventory.create({
          data: {
            productId: data.productId,
            colorId: data.colorId || null,
            location: data.location,
            quantity: newQty,
            rollCount: newRolls
          }
        });
      }

      // 2. Registramos el movimiento para el Kardex / Auditoría
      const movement = await tx.inventoryMovement.create({
        data: {
          productId: data.productId,
          colorId: data.colorId || null,
          location: data.location,
          type: data.type,
          quantity: data.quantity, // En ajuste guardamos lo que el usuario digitó
          rollCount: data.rollCount,
          provider: data.type === "ENTRADA" ? data.provider : null,
          authorizedBy: data.authorizedBy,
          notes: data.notes
        }
      });

      return movement;
    });

    // Purgar caché para que el historial global se actualice inmediatamente
    revalidatePath('/crm/admin/inventario');
    revalidatePath('/crm/admin/inventario/historial');

    return { success: true, movementId: result.id };
    
  } catch (error: any) {
    console.error("🚨 Error en registerMovementAction:", error);
    return { 
      success: false, 
      error: error.message || "Error de concurrencia al procesar el Kardex." 
    };
  }
}