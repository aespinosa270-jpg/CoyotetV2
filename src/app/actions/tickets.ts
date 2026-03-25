// src/app/actions/tickets.ts
"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "../../auth";
import { revalidatePath } from "next/cache";
import { TicketStatus, TicketPriority } from "@prisma/client";

const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  ABIERTO:     ["EN_REVISION"],
  EN_REVISION: ["RESUELTO", "ABIERTO"],
  RESUELTO:    ["CERRADO", "EN_REVISION"],
  CERRADO:     [],
};

// ── Selector reutilizable ────────────────────────────────────
const ticketInclude = {
  user: {
    select: {
      id: true, name: true, email: true,
      phone: true, hashId: true, company: true,
    },
  },
  employee: { select: { id: true, name: true, status: true } },
  order:    { select: { id: true, orderNumber: true, status: true } },
  _count:   { select: { messages: true } },
} as const;

// ==========================================================
// QUERIES
// ==========================================================

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
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
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
  const [abiertos, enRevision, resueltos, cerrados, criticos, resolvedTimes] =
    await Promise.all([
      prisma.ticket.count({ where: { status: "ABIERTO" } }),
      prisma.ticket.count({ where: { status: "EN_REVISION" } }),
      prisma.ticket.count({ where: { status: "RESUELTO" } }),
      prisma.ticket.count({ where: { status: "CERRADO" } }),
      prisma.ticket.count({
        where: {
          priority: "URGENTE",
          status:   { in: ["ABIERTO", "EN_REVISION"] },
        },
      }),
      prisma.ticket.findMany({
        where: { status: { in: ["RESUELTO", "CERRADO"] } },
        select: { createdAt: true, updatedAt: true },
      }),
    ]);

  const avgHoursValue =
    resolvedTimes.length === 0
      ? 0
      : resolvedTimes.reduce((sum, t) => {
          const created = t.createdAt.getTime();
          const updated = t.updatedAt.getTime();
          const diffMs = Math.max(0, updated - created);
          return sum + diffMs / 3600000;
        }, 0) / resolvedTimes.length;
  const avgHours = avgHoursValue.toFixed(1);

  return {
    abiertos,
    // El frontend admin usa el tab "pendientes" para el estado EN_REVISION.
    pendientes: enRevision,
    enRevision,
    resueltos,
    cerrados,
    criticos,
    avgHours,
  };
}

export async function getMisTickets() {
  const session = await auth();
  if (!session?.user?.employeeId) return [];

  return prisma.ticket.findMany({
    where: {
      employeeId: session.user.employeeId,
      status:     { in: ["ABIERTO", "EN_REVISION"] },
    },
    include: ticketInclude,
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
}

export async function getTicketById(id: string) {
  return prisma.ticket.findUnique({
    where: { id },
    include: {
      user:     { select: { id: true, name: true, email: true, phone: true, hashId: true, membershipTier: true, company: true, ltv: true } },
      employee: { select: { id: true, name: true, status: true } },
      order:    true,
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          employee: { select: { id: true, name: true } },
          user:     { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
}

// ==========================================================
// MUTATIONS
// ==========================================================

// ← Nombre que usa SoporteClient.tsx
export async function updateTicketStatusAction(
  ticketId: string,
  nuevoStatus: TicketStatus
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.employeeId) {
    return { success: false, error: "No autorizado" };
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { success: false, error: "Ticket no encontrado" };

  const permitidos = VALID_TRANSITIONS[ticket.status];
  if (!permitidos.includes(nuevoStatus)) {
    return {
      success: false,
      error: `No puedes pasar de ${ticket.status} a ${nuevoStatus}`,
    };
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status:    nuevoStatus,
      updatedAt: new Date(),
      // Auto-asigna al agente si mueve a EN_REVISION y no tenía asignado
      ...(nuevoStatus === "EN_REVISION" && !ticket.employeeId
        ? { employeeId: session.user.employeeId }
        : {}),
    },
  });

  revalidatePath("/crm/admin/tickets");
  revalidatePath("/crm/agente/tickets");
  return { success: true };
}

// Botón "Resolver" en UI (Abiertos/Pendientes).
// - ABIERTO -> EN_REVISION
// - EN_REVISION -> RESUELTO
export async function resolveTicketAction(
  ticketId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.employeeId) {
    return { success: false, error: "No autorizado" };
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { success: false, error: "Ticket no encontrado" };

  const nextStatus: TicketStatus =
    ticket.status === "ABIERTO"
      ? "EN_REVISION"
      : ticket.status === "EN_REVISION"
        ? "RESUELTO"
        : ticket.status;

  const permitidos = VALID_TRANSITIONS[ticket.status];
  if (!permitidos.includes(nextStatus)) {
    return {
      success: false,
      error: `No puedes resolver desde ${ticket.status} → ${nextStatus}`,
    };
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: nextStatus,
      updatedAt: new Date(),
      ...(nextStatus === "EN_REVISION" && !ticket.employeeId
        ? { employeeId: session.user.employeeId }
        : {}),
    },
  });

  revalidatePath(`/crm/admin/tickets/${ticketId}`);
  revalidatePath("/crm/admin/tickets");
  revalidatePath("/crm/agente/tickets");
  return { success: true };
}

export async function asignarTicket(ticketId: string, employeeId: string) {
  const session = await auth();
  if (!session?.user?.employeeId) return { success: false, error: "No autorizado" };

  await prisma.ticket.update({
    where: { id: ticketId },
    data:  { employeeId, status: "EN_REVISION" },
  });

  revalidatePath("/crm/admin/tickets");
  return { success: true };
}

export async function responderTicket(
  ticketId: string,
  body: string,
  isInternal = false
) {
  const session = await auth();
  if (!session?.user?.employeeId) return { success: false, error: "No autorizado" };

  await prisma.ticketMessage.create({
    data: { ticketId, employeeId: session.user.employeeId, body, isInternal },
  });

  // Si el agente responde y el ticket estaba ABIERTO → pasa a EN_REVISION
  if (!isInternal) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (ticket?.status === "ABIERTO") {
      await prisma.ticket.update({
        where: { id: ticketId },
        data:  { status: "EN_REVISION" },
      });
    }
  }

  revalidatePath(`/crm/admin/tickets/${ticketId}`);
  revalidatePath("/crm/admin/tickets");
  return { success: true };
}

// Alias compatible con `TicketDetalleClient.tsx`
// El cliente pasa `currentEmployeeId`, pero aquí usamos `auth()` para obtener el employeeId real.
export async function addTicketMessageAction(
  ticketId: string,
  body: string,
  isInternal = false,
  _currentEmployeeId?: string
) {
  return responderTicket(ticketId, body, isInternal);
}

export async function autoAsignarTicket(ticketId: string) {
  const agentes = await prisma.employee.findMany({
    where: {
      isActive: true,
      status:   "active",
      role:     { in: ["VENDEDORA", "ADMIN", "SUPERVISOR"] },
    },
    include: {
      _count: {
        select: {
          assignedTickets: {
            where: { status: { in: ["ABIERTO", "EN_REVISION"] } },
          },
        },
      },
    },
  });

  if (!agentes.length) return { success: false, error: "No hay agentes activos" };

  const agente = agentes.sort(
    (a, b) => a._count.assignedTickets - b._count.assignedTickets
  )[0];

  await prisma.ticket.update({
    where: { id: ticketId },
    data:  { employeeId: agente.id, status: "EN_REVISION" },
  });

  revalidatePath("/crm/admin/tickets");
  return { success: true, asignadoA: agente.name };
}