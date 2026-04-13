"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function getAgentDashboardMetrics() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  const agenteId = session.user.id;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  try {
    // 1. Tickets resueltos hoy
    const resueltosHoy = await prisma.ticket.count({
      where: {
        employeeId: agenteId,
        status: "RESUELTO",
        updatedAt: { gte: hoy },
      },
    });

    // 2. Tickets actualmente abiertos/en revisión
    const pendientes = await prisma.ticket.count({
      where: {
        employeeId: agenteId,
        status: { in: ["ABIERTO", "EN_REVISION"] },
      },
    });

    // 3. Tasa de resolución (histórica)
    const totalAsignados = await prisma.ticket.count({
      where: { employeeId: agenteId },
    });
    const totalResueltos = await prisma.ticket.count({
      where: { employeeId: agenteId, status: { in: ["RESUELTO", "CERRADO"] } },
    });
    const tasaResolucion = totalAsignados > 0 
      ? Math.round((totalResueltos / totalAsignados) * 100) 
      : 0;

    // 4. Últimas 5 interacciones (Timeline)
    const actividadReciente = await prisma.ticket.findMany({
      where: { employeeId: agenteId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        status: true,
        updatedAt: true,
      }
    });

    return {
      success: true,
      data: { resueltosHoy, pendientes, tasaResolucion, actividadReciente }
    };
  } catch (error) {
    console.error("Error obteniendo métricas:", error);
    return { success: false, error: "Error al cargar el panel." };
  }
}