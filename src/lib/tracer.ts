import { prisma } from "@/lib/prisma";

interface CreateTraceParams {
  employeeId: string;
  phone: string;
  type: "WHATSAPP" | "EMAIL" | "CALL" | "NOTE" | string;
  summary: string;
  content: Record<string, any>;
  actionName: string;
}

export async function createTrace({
  employeeId,
  phone,
  type,
  summary,
  content,
  actionName,
}: CreateTraceParams): Promise<void> {
  try {
    await (prisma as any).trace.create({
      data: {
        employeeId,
        phone,
        type,
        summary,
        content,
        actionName,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    // Silencioso para no romper el flujo principal
    console.error("❌ Error en createTrace:", error);
  }
}