"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function getQualityMetrics() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPERVISOR") {
    return { success: false, error: "No autorizado" };
  }

  try {
    // 1. Traer solo las alertas de calidad (flags de la IA) de los últimos 30 días
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const flags = await prisma.auditLog.findMany({
      where: { 
        action: "FLAG_CALIDAD",
        timestamp: { gte: hace30Dias }
      },
      orderBy: { timestamp: "desc" },
      include: {
        employee: { select: { id: true, name: true, role: true } }
      }
    });

    // 2. Agrupar para el "Muro de la Vergüenza" (Agentes con más infracciones)
    const rankingMap = new Map<string, { name: string, role: string, count: number }>();
    
    flags.forEach(flag => {
      if (!flag.employee) return;
      const empId = flag.employee.id;
      if (!rankingMap.has(empId)) {
        rankingMap.set(empId, { name: flag.employee.name, role: flag.employee.role, count: 0 });
      }
      rankingMap.get(empId)!.count++;
    });

    const ranking = Array.from(rankingMap.values()).sort((a, b) => b.count - a.count);

    return { success: true, data: { flags, ranking } };
  } catch (error) {
    console.error("Error obteniendo métricas de calidad:", error);
    return { success: false, error: "Error al cargar métricas QA." };
  }
}