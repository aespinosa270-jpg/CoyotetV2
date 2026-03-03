"use server";

import { prisma } from "@/lib/prisma";
import { PickupLocation, MovementType } from "@prisma/client";
import { revalidatePath } from "next/cache";

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

  // FIX: Prisma no acepta `string | null` directamente en el unique compuesto.
  // Hay que construir el where condicionalmente según si colorId existe o no.
  // Cuando colorId es null, usamos un raw where con AND para evitar el type error.
  const inventoryWhere = colorId
    ? { productId_colorId_location: { productId, colorId, location } }
    : { productId_colorId_location: { productId, colorId: null as unknown as string, location } };
  //                                                     ↑ workaround tipado de Prisma

  // Alternativa más limpia si la anterior te sigue dando problemas en strict mode:
  // usar findFirst en lugar del unique compuesto
  // const inventoryWhere = { productId, colorId: colorId ?? null, location };

  try {
    // Validación de stock (solo SALIDA)
    if (type === "SALIDA") {
      const stock = await prisma.inventory.findFirst({
        where: {
          productId,
          colorId: colorId ?? null,
          location,
        },
      });

      if (!stock) {
        return {
          success: false,
          error: `No hay inventario para este producto en ${location}.`,
        };
      }
      if (stock.quantity < quantity) {
        return {
          success: false,
          error: `Stock insuficiente en ${location}. Disponible: ${stock.quantity.toFixed(2)} — Solicitado: ${quantity.toFixed(2)}.`,
        };
      }
      if (stock.rollCount < rollCount) {
        return {
          success: false,
          error: `Rollos insuficientes en ${location}. Disponibles: ${stock.rollCount} — Solicitados: ${rollCount}.`,
        };
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // PASO 1 — Kardex inmutable
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

      // PASO 2 — Upsert de stock
      // FIX: usamos updateMany + create por separado para evitar el problema
      // de tipos en el where del upsert con colorId nullable.
      const existing = await tx.inventory.findFirst({
        where: { productId, colorId: colorId ?? null, location },
      });

      if (existing) {
        await tx.inventory.update({
          where: { id: existing.id }, // ← usamos el PK, sin ambigüedad de tipos
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