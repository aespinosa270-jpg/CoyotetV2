import { prisma } from "@/lib/prisma";

interface CreateTraceParams {
  employeeId?: string | null;
  phone?: string;
  type?: "WHATSAPP" | "EMAIL" | "CALL" | "NOTE" | "PRESENCIAL" | string;
  summary: string;
  content?: Record<string, any>;
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
    // 1. Armamos el JSON de metadata súper limpio (sin undefineds)
    const metadataObj = {
      summary,
      ...(phone ? { phone } : {}),
      ...(type ? { type } : {}),
      ...content,
    };

    // 2. Separamos la lógica para esquivar el berrinche de TypeScript
    if (employeeId) {
      // 🔥 Forma nativa de Prisma: Conectar la relación en lugar de pasar el ID directo
      await prisma.auditLog.create({
        data: {
          action: actionName,
          metadata: metadataObj,
          employee: { connect: { id: employeeId } } // <--- EL SECRETO ESTÁ AQUÍ
        }
      });
    } else {
      // 🤖 Si no hay empleado (es el SISTEMA/Webhook), se crea sin relación
      await prisma.auditLog.create({
        data: {
          action: actionName,
          metadata: metadataObj,
        }
      });
    }
  } catch (error) {
    console.error("❌ Error en createTrace (AuditLog):", error);
  }
}