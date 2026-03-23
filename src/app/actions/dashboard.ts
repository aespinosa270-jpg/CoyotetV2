"use server";

import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, format } from "date-fns";

export async function getAdminStats() {
  const now = new Date();
  const sevenDaysAgo = subDays(startOfDay(now), 7);

  const [deals, inventory, agents, lastWeekDeals] = await Promise.all([
    // Todos los deals para KPIs generales
    prisma.deal.findMany({ include: { employee: true } }),
    
    // Inventario para valuación
    prisma.inventory.findMany({ include: { product: true } }),
    
    // Agentes para el ranking
    prisma.employee.findMany({ where: { isActive: true }, include: { deals: true } }),
    
    // Deals ganados de la última semana para la gráfica
    prisma.deal.findMany({
      where: {
        status: "CERRADO_GANADO",
        updatedAt: { gte: sevenDaysAgo }
      },
      select: { value: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' }
    })
  ]);

  // 1. Agrupar ventas por día (Últimos 7 días)
  const dailySales = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(now, 6 - i);
    const dateStr = format(date, 'dd MMM');
    const dayTotal = lastWeekDeals
      .filter(d => format(d.updatedAt, 'dd MMM') === dateStr)
      .reduce((acc, d) => acc + Number(d.value), 0);
    
    return { name: dateStr, total: dayTotal };
  });

  // 2. Revenue Total (Ventas Ganadas)
  const revenueTotal = deals
    .filter(d => d.status === "CERRADO_GANADO")
    .reduce((acc, d) => acc + Number(d.value), 0);

  // 3. Valor de Inventario (Existencia * Precio Mayoreo)
  const inventoryValue = inventory.reduce((acc, item) => {
    return acc + (Number(item.quantity) * Number(item.product.priceMayoreo));
  }, 0);

  // 4. Top Agentes
  const agentPerformance = agents.map(agent => {
    const totalWon = agent.deals
      .filter(d => d.status === "CERRADO_GANADO")
      .reduce((acc, d) => acc + Number(d.value), 0);
    return {
      name: agent.name,
      value: totalWon,
      count: agent.deals.length
    };
  }).sort((a, b) => b.value - a.value);

  return {
    revenueTotal,
    inventoryValue,
    totalDeals: deals.length,
    activeSkus: new Set(inventory.map(i => i.productId)).size,
    agentPerformance: agentPerformance.slice(0, 5),
    dailySales
  };
}