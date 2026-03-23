"use server";

import { prisma } from "@/lib/prisma";

export async function getPayrollData() {
  try {
    // Calculamos el inicio del mes actual para filtrar ventas recientes
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      include: {
        deals: {
          where: {
            status: "CERRADO_GANADO",
            updatedAt: { gte: startOfMonth }
          }
        }
      }
    });

    // Mapeamos y calculamos las comisiones
    const payroll = employees.map(emp => {
      const totalSales = emp.deals.reduce((sum, deal) => sum + Number(deal.value), 0);
      const totalCommission = totalSales * (emp.commissionRate / 100);
      
      return {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        commissionRate: emp.commissionRate,
        totalSales,
        totalCommission,
        dealsCount: emp.deals.length
      };
    });

    // Filtramos para mostrar solo a los que generaron ventas o son perfil de ventas
    const activePayroll = payroll.filter(emp => emp.totalSales > 0 || emp.commissionRate > 0);

    // Ordenamos del que más comisión gana al que menos (Top Performers arriba)
    return activePayroll.sort((a, b) => b.totalCommission - a.totalCommission);
  } catch (error) {
    console.error("[getPayrollData]", error);
    return [];
  }
}