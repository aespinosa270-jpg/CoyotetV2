import { prisma } from "@/lib/prisma";
import { InteractionType, PipelineStatus, TicketPriority } from "@prisma/client";

interface TraceParams {
  employeeId: string;
  phone: string; // Usamos el teléfono para buscar o crear al usuario
  type: InteractionType;
  summary: string;
  content?: any;
  actionName: string; // Ej: "ENVIO_WHATSAPP", "LLAMADA_ZADARMA"
}

export async function createTrace({ employeeId, phone, type, summary, content, actionName }: TraceParams) {
  try {
    // 1. Buscar al Usuario por teléfono (o crearlo como Prospecto / Lead fantasma si no existe)
    let user = await prisma.user.findFirst({ where: { phone } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          name: "Prospecto Nuevo",
          email: `${phone}@coyotetextil.temp`, // Email dummy requerido por tu DB
          password: "NO_PASSWORD",
          role: "USER",
        }
      });

      // ¡NUEVO PROSPECTO! Le creamos su Deal (Lead) automáticamente en el Pipeline
      await prisma.deal.create({
        data: {
          title: `Oportunidad: ${phone}`,
          company: "Sin Registrar",
          userId: user.id,
          employeeId: employeeId,
          status: PipelineStatus.PROSPECTO,
        }
      });
    }

    // 2. Crear la Interacción en el Timeline del Cliente
    const interaction = await prisma.interaction.create({
      data: {
        employeeId,
        userId: user.id,
        type,
        summary,
        content: content ? JSON.parse(JSON.stringify(content)) : null,
      }
    });

    // 3. Crear el AuditLog (Registro inborrable para los Admins)
    await prisma.auditLog.create({
      data: {
        employeeId,
        action: actionName,
        resourceId: interaction.id,
        metadata: content ? JSON.parse(JSON.stringify(content)) : null,
      }
    });

    return { success: true, interaction, user };

  } catch (error) {
    console.error("❌ Error en el Tracer Automático:", error);
    return { success: false, error };
  }
}