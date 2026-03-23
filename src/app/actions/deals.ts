"use server";

import { prisma } from "@/lib/prisma";
import { PipelineStatus, PickupLocation } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { registerMovementAction } from "./inventory"; 

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type CreateDealInput = {
  title:      string;
  company:    string;
  employeeId: string;
  value:      number;
  productId?: string;
  color?:     string; // Mapeado a 'color' según tu schema
  quantity?:  number;
  userId?:    string;
};

export type DealResult =
  | { success: true;  dealId: string }
  | { success: false; error: string  };

// ─── ACTIONS ─────────────────────────────────────────────────────────────────

export async function createDealAction(input: CreateDealInput): Promise<DealResult> {
  const { title, company, employeeId, value, productId, color, quantity, userId } = input;

  if (!title?.trim())   return { success: false, error: "El título es obligatorio." };
  if (!company?.trim()) return { success: false, error: "La empresa es obligatoria." };
  if (!employeeId)      return { success: false, error: "Debes asignar un agente." };
  if (value < 0)        return { success: false, error: "El valor no puede ser negativo." };

  try {
    const deal = await prisma.deal.create({
      data: {
        title, company, employeeId, value,
        productId: productId || null,
        color:     color     || null,
        quantity:  quantity  || null,
        userId:    userId    || null,
        status:    "PROSPECTO",
      },
    });
    revalidatePath("/crm/admin/leads");
    return { success: true, dealId: deal.id };
  } catch (err) {
    console.error("[createDealAction]", err);
    return { success: false, error: "Error al crear el registro." };
  }
}

export async function moveDealAction(dealId: string, status: PipelineStatus): Promise<DealResult> {
  if (!dealId) return { success: false, error: "ID de Deal no proporcionado." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const deal = await tx.deal.findUnique({
        where: { id: dealId },
        include: { employee: true }
      });

      if (!deal) throw new Error("El Deal no existe en la base de datos.");

      if (status === "CERRADO_GANADO") {
        if (!deal.productId || !deal.quantity) {
          throw new Error("Información insuficiente: El deal requiere producto y cantidad.");
        }

        // 🔥 FIX: Mapeamos deal.color (del schema) a colorId (de la acción de inventario)
        const invRes = await registerMovementAction({
          type: "SALIDA",
          productId: deal.productId,
          colorId:   deal.color || undefined, 
          location:  PickupLocation.GUATEMALA_97, 
          quantity:  deal.quantity,
          rollCount: 0, 
          authorizedBy: deal.employee.name,
          notes: `Salida automática por cierre de venta: ${deal.title}`,
          orderId: deal.id
        });

        if (!invRes.success) {
          throw new Error(invRes.error);
        }
      }

      return await tx.deal.update({
        where: { id: dealId },
        data: { status }
      });
    });

    revalidatePath("/crm/admin/leads");
    revalidatePath("/crm/admin/inventario");
    
    return { success: true, dealId: result.id };
  } catch (err: any) {
    console.error("[moveDealAction]", err);
    return { success: false, error: err.message || "Error al procesar el cambio de estado." };
  }
}

export async function deleteDealAction(dealId: string): Promise<DealResult> {
  try {
    await prisma.deal.delete({ where: { id: dealId } });
    revalidatePath("/crm/admin/leads");
    return { success: true, dealId };
  } catch (err) {
    console.error("[deleteDealAction]", err);
    return { success: false, error: "Error al eliminar el registro." };
  }
}

// ─── QUERIES ────────────────────────────────────────────────────────────────

export async function getDealsByStatus() {
  const deals = await prisma.deal.findMany({
    include: {
      employee: { select: { id: true, name: true } },
      product:  { select: { id: true, title: true, sku: true } },
      user:     { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const columns: Record<PipelineStatus, typeof deals> = {
    PROSPECTO: [], COTIZANDO: [], NEGOCIACION: [],
    CERRADO_GANADO: [], CERRADO_PERDIDO: [],
  };

  for (const deal of deals) {
    columns[deal.status].push(deal);
  }

  return columns;
}

export async function getDealById(id: string) {
  return prisma.deal.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      product:  { select: { id: true, title: true, sku: true, unit: true } },
      user:     { select: { id: true, name: true, email: true, phone: true } },
    },
  });
}

export async function getActiveAgents() {
  return prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function getActiveProducts() {
  return prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, title: true, sku: true, unit: true, priceMayoreo: true },
    orderBy: { title: "asc" },
  });
}

export async function getPipelineKPIs() {
  const [total, ganados, perdidos, valorTotal, valorGanado] = await Promise.all([
    prisma.deal.count(),
    prisma.deal.count({ where: { status: "CERRADO_GANADO"  } }),
    prisma.deal.count({ where: { status: "CERRADO_PERDIDO" } }),
    prisma.deal.aggregate({ _sum: { value: true } }),
    prisma.deal.aggregate({ where: { status: "CERRADO_GANADO" }, _sum: { value: true } }),
  ]);

  const cerrados = ganados + perdidos;

  return {
    total, ganados, perdidos,
    winRate:     cerrados > 0 ? Math.round((ganados / cerrados) * 100) : 0,
    valorTotal:  valorTotal._sum.value  ?? 0,
    valorGanado: valorGanado._sum.value ?? 0,
  };
}