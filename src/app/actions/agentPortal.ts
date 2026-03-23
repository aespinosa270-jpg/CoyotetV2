"use server";

import { prisma } from "@/lib/prisma";

export async function getAgentDashboardData(employeeId: string) {
  try {
    const agent = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        deals: {
          include: { 
            product: { select: { title: true, sku: true } }, 
            user: { select: { name: true, company: true } } 
          },
          orderBy: { updatedAt: "desc" }
        }
      }
    });

    if (!agent) throw new Error("Agente no encontrado");

    // Filtrar deals por estado
    const activeDeals = agent.deals.filter(d => d.status !== "CERRADO_GANADO" && d.status !== "CERRADO_PERDIDO");
    const wonDeals = agent.deals.filter(d => d.status === "CERRADO_GANADO");
    const lostDeals = agent.deals.filter(d => d.status === "CERRADO_PERDIDO");

    // Calcular montos de ventas
    const activeValue = activeDeals.reduce((sum, d) => sum + Number(d.value), 0);
    const wonValue = wonDeals.reduce((sum, d) => sum + Number(d.value), 0);

    // Calcular COMISIONES (La magia)
    const commissionEarned = wonValue * (agent.commissionRate / 100);
    const potentialCommission = activeValue * (agent.commissionRate / 100);

    // Calcular Win Rate
    const totalFinished = wonDeals.length + lostDeals.length;
    const winRate = totalFinished > 0 ? Math.round((wonDeals.length / totalFinished) * 100) : 0;

    return {
      agent: { 
        id: agent.id, 
        name: agent.name, 
        commissionRate: agent.commissionRate 
      },
      kpis: {
        activeValue, 
        wonValue, 
        commissionEarned, 
        potentialCommission,
        activeCount: activeDeals.length, 
        winRate
      },
      // Separamos para la vista
      activePipeline: activeDeals.slice(0, 15), 
      recentHistory: [...wonDeals, ...lostDeals].slice(0, 10)
    };
  } catch (error) {
    console.error("[getAgentDashboardData]", error);
    return null;
  }
}