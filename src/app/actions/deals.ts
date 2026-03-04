"use server";

import { prisma } from "@/lib/prisma";
import { PipelineStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type CreateDealInput = {
  title:      string;
  company:    string;
  employeeId: string;
  value:      number;
  productId?: string;
  color?:     string;
  quantity?:  number;
  userId?:    string;
};

export type DealResult =
  | { success: true;  dealId: string }
  | { success: false; error: string  };

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
    return { success: false, error: "Error al crear el deal." };
  }
}

export async function moveDealAction(dealId: string, status: PipelineStatus): Promise<DealResult> {
  if (!dealId) return { success: false, error: "Deal no encontrado." };
  try {
    await prisma.deal.update({ where: { id: dealId }, data: { status } });
    revalidatePath("/crm/admin/leads");
    return { success: true, dealId };
  } catch (err) {
    console.error("[moveDealAction]", err);
    return { success: false, error: "Error al mover el deal." };
  }
}

export async function deleteDealAction(dealId: string): Promise<DealResult> {
  try {
    await prisma.deal.delete({ where: { id: dealId } });
    revalidatePath("/crm/admin/leads");
    return { success: true, dealId };
  } catch (err) {
    console.error("[deleteDealAction]", err);
    return { success: false, error: "Error al eliminar el deal." };
  }
}

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
  for (const deal of deals) columns[deal.status].push(deal);
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