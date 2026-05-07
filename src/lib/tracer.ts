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
    // 1. Armamos el JSON base
    const metadataObj = {
      summary,
      ...(phone ? { phone } : {}),
      ...(type ? { type } : {}),
      ...content,
    };

    // 🔥 LA MAGIA DEL CTO: Validamos que sea un ID real de base de datos (CUID/UUID).
    // Si el webhook manda "BOT", su length es 3, por lo que lo detectamos como falso.
    const isRealEmployee = employeeId && employeeId.length > 10;

    if (isRealEmployee) {
      await prisma.auditLog.create({
        data: {
          action: actionName,
          metadata: metadataObj,
          employee: { connect: { id: employeeId } } 
        }
      });
    } else {
      // 🤖 Fue el Bot o el Sistema. No hacemos el 'connect' para evitar que Prisma truene.
      // Pero agregamos quién fue a la metadata para no perder el rastro.
      await prisma.auditLog.create({
        data: {
          action: actionName,
          metadata: {
            ...metadataObj,
            triggeredBy: employeeId || "SYSTEM"
          },
        }
      });
    }
  } catch (error) {
    console.error("❌ Error en createTrace (AuditLog):", error);
  }
}