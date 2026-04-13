"use server";

import { prisma } from "@/lib/prisma";

export async function getAuditLogs(limit = 100) {
  try {
    const logs = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        employee: {
          select: { name: true, role: true, email: true }
        }
      }
    });

    return { success: true, data: logs };
  } catch (error) {
    console.error("Error obteniendo logs de auditoría:", error);
    return { success: false, error: "Error al cargar los registros de auditoría." };
  }
}