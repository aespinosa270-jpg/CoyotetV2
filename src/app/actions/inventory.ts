"use server";

import { prisma } from "@/lib/prisma";
import { PickupLocation, MovementType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth"; // 🔥 Recuperamos la seguridad
import { createTrace } from "@/lib/tracer"; // 🔥 Recuperamos el Gran Hermano

export type RegisterMovementInput = {
  type: MovementType;
  productId: string;
  colorId?: string;
  location: PickupLocation;
  quantity: number;
  rollCount: number;
  provider?: string;
  authorizedBy: string;
  notes?: string;
  orderId?: string;
};

export type MovementResult =
  | { success: true; movementId: string }
  | { success: false; error: string };

export async function registerMovementAction(
  input: RegisterMovementInput
): Promise<MovementResult> {
  const {
    type, productId, colorId, location,
    quantity, rollCount, provider, authorizedBy, notes, orderId,
  } = input;

  if (!productId)          return { success: false, error: "Producto requerido." };
  if (!authorizedBy?.trim()) return { success: false, error: "Debes indicar quién autoriza." };
  if (quantity <= 0)       return { success: false, error: "La cantidad debe ser mayor a 0." };
  if (rollCount < 0)       return { success: false, error: "Rollos no puede ser negativo." };

  try {
    const session = await auth();
    const employeeId = session?.user?.id || null;

    // 🔥 FIX: Eliminamos las validaciones de "stock insuficiente" para que la operación 
    // fluya en el mundo real, permitiendo números negativos temporales si es necesario.

    const result = await prisma.$transaction(async (tx) => {
      // PASO 1 — Kardex inmutable (La bitácora física)
      const movement = await tx.inventoryMovement.create({
        data: {
          type,
          productId,
          colorId: colorId ?? null,
          location,
          quantity,
          rollCount,
          provider:     provider     ?? null,
          authorizedBy,
          notes:        notes        ?? null,
          orderId:      orderId      ?? null,
        },
      });

      const delta     = type === "ENTRADA" ?  quantity  : -quantity;
      const rollDelta = type === "ENTRADA" ?  rollCount : -rollCount;

      // PASO 2 — Upsert de stock (A prueba de balas con tu lógica de findFirst)
      const existing = await tx.inventory.findFirst({
        where: { productId, colorId: colorId ?? null, location },
      });

      if (existing) {
        await tx.inventory.update({
          where: { id: existing.id }, // ← PK directo, cero ambigüedad
          data: {
            quantity:  { increment: delta },
            rollCount: { increment: rollDelta },
          },
        });
      } else {
        await tx.inventory.create({
          data: {
            productId,
            colorId:  colorId ?? null,
            location,
            quantity: delta,
            rollCount: rollDelta,
          },
        });
      }

      return movement;
    });

    // 🕵️‍♂️ PASO 3 — RASTRO DE AUDITORÍA (Gran Hermano)
    if (employeeId) {
      await createTrace({
        employeeId: employeeId,
        actionName: "INVENTORY_MOVEMENT",
        summary: `Registró una ${type} de ${quantity.toFixed(2)} unidades en ${location}.`,
        content: { movementId: result.id, productId, quantity, location }
      });
    }

    revalidatePath("/crm/admin/inventario");
    revalidatePath("/crm/admin/inventario/historial");

    return { success: true, movementId: result.id };
  } catch (err) {
    console.error("[registerMovementAction]", err);
    return { success: false, error: "Error interno. Intenta de nuevo." };
  }
}

// ─── QUERIES ────────────────────────────────────────────────────────────────

export async function getProductsWithColors() {
  return prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      title: true,
      sku: true,
      unit: true,
      colors: { select: { id: true, name: true, hex: true } },
    },
    orderBy: { title: "asc" },
  });
}

export async function getInventoryDashboard() {
  return prisma.inventory.findMany({
    include: {
      product: { select: { title: true, sku: true, unit: true } },
      color:   { select: { name: true, hex: true } },
    },
    orderBy: [{ product: { title: "asc" } }, { location: "asc" }],
  });
}

export async function getMovementHistory(limit = 100) {
  return prisma.inventoryMovement.findMany({
    take: limit,
    include: {
      product: { select: { title: true, sku: true } },
      color:   { select: { name: true, hex: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}