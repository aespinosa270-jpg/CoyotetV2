"use server";

import { prisma } from "@/lib/prisma";
import { TicketStatus, TicketPriority } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type CreateTicketInput = {
  subject:    string;
  description: string;
  priority:   TicketPriority;
  userId:     string;
  employeeId?: string;
  orderId?:   string;
};

export type TicketResult =
  | { success: true;  ticketId: string }
  | { success: false; error: string    };

export async function createTicketAction(input: CreateTicketInput): Promise<TicketResult> {
  const { subject, description, priority, userId, employeeId, orderId } = input;
  if (!subject?.trim())     return { success: false, error: "El asunto es obligatorio."     };
  if (!description?.trim()) return { success: false, error: "La descripción es obligatoria." };
  if (!userId)              return { success: false, error: "El cliente es obligatorio."     };

  try {
    const ticket = await prisma.ticket.create({
      data: {
        subject, description, priority, userId,
        employeeId: employeeId || null,
        orderId:    orderId    || null,
        status: "ABIERTO",
      },
    });
    revalidatePath("/crm/admin/tickets");
    return { success: true, ticketId: ticket.id };
  } catch (err) {
    console.error("[createTicketAction]", err);
    return { success: false, error: "Error al crear el ticket." };
  }
}

export async function resolveTicketAction(ticketId: string): Promise<TicketResult> {
  try {
    await prisma.ticket.update({
      where: { id: ticketId },
      data:  { status: "RESUELTO" },
    });
    revalidatePath("/crm/admin/tickets");
    return { success: true, ticketId };
  } catch (err) {
    console.error("[resolveTicketAction]", err);
    return { success: false, error: "Error al resolver el ticket." };
  }
}

export async function updateTicketStatusAction(
  ticketId: string, status: TicketStatus
): Promise<TicketResult> {
  try {
    await prisma.ticket.update({ where: { id: ticketId }, data: { status } });
    revalidatePath("/crm/admin/tickets");
    return { success: true, ticketId };
  } catch (err) {
    console.error("[updateTicketStatusAction]", err);
    return { success: false, error: "Error al actualizar." };
  }
}

// ── Queries ───────────────────────────────────────────────────────────────────

const ticketInclude = {
  employee: { select: { id: true, name: true } },
  user:     { select: { id: true, name: true, email: true } },
  order:    { select: { id: true, orderNumber: true } },
} as const;

export async function getTicketsAbiertos() {
  return prisma.ticket.findMany({
    where:   { status: "ABIERTO" },
    include: ticketInclude,
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
}

export async function getTicketsPendientes() {
  return prisma.ticket.findMany({
    where:   { status: "EN_REVISION" },
    include: ticketInclude,
    orderBy: { createdAt: "asc" },
  });
}

export async function getTicketsCerrados() {
  return prisma.ticket.findMany({
    where:   { status: { in: ["RESUELTO", "CERRADO"] } },
    include: ticketInclude,
    orderBy: { updatedAt: "desc" },
    take:    100,
  });
}

export async function getTicketKPIs() {
  const [abiertos, enRevision, resueltos, urgentes] = await Promise.all([
    prisma.ticket.count({ where: { status: "ABIERTO"     } }),
    prisma.ticket.count({ where: { status: "EN_REVISION" } }),
    prisma.ticket.count({ where: { status: { in: ["RESUELTO", "CERRADO"] } } }),
    prisma.ticket.count({ where: { status: "ABIERTO", priority: "URGENTE" } }),
  ]);

  const resueltosList = await prisma.ticket.findMany({
    where:   { status: { in: ["RESUELTO", "CERRADO"] } },
    select:  { createdAt: true, updatedAt: true },
    take:    50,
    orderBy: { updatedAt: "desc" },
  });

  const avgHours =
    resueltosList.length > 0
      ? resueltosList.reduce((s, t) => {
          return s + (t.updatedAt.getTime() - t.createdAt.getTime()) / 3600000;
        }, 0) / resueltosList.length
      : 0;

  return { abiertos, pendientes: enRevision, resueltos, criticos: urgentes, avgHours: avgHours.toFixed(1) };
}