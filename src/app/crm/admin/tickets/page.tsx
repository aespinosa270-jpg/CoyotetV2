// src/app/crm/admin/tickets/page.tsx
import { prisma } from "@/lib/prisma";
import TicketsClient from "./_components/TicketsClient";
import { TicketPriority, TicketStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function AdminTicketsPage() {
  // 1. Traemos todos los tickets con sus relaciones
  const allTickets = await prisma.ticket.findMany({
    include: {
      employee: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true, company: true } },
      order: { select: { id: true, orderNumber: true } },
      messages: { select: { id: true } } // Para el conteo de mensajes
    },
    orderBy: { updatedAt: 'desc' }
  });

  // Helper para formatear un ticket según la interfaz del cliente
  const formatTicket = (t: any) => ({
    id: t.id,
    subject: t.subject,
    description: t.description,
    priority: t.priority as TicketPriority,
    status: t.status as TicketStatus,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    employee: t.employee,
    user: t.user ? {
      id: t.user.id,
      name: t.user.name || "Sin nombre", // Fallback si name es nulo
      email: t.user.email || "sin@email.com", // Fallback si email es nulo
      company: t.user.company
    } : null,
    order: t.order ? {
      id: t.order.id,
      orderNumber: String(t.order.orderNumber)
    } : null,
    _count: { messages: t.messages.length }
  });

  // 2. Agrupamos la data para que tu cliente la lea en sus pestañas
  const groupedData = {
    abiertos: allTickets.filter(t => t.status === "ABIERTO").map(formatTicket),
    pendientes: allTickets.filter(t => t.status === "EN_REVISION").map(formatTicket),
    cerrados: allTickets.filter(t => ["RESUELTO", "CERRADO"].includes(t.status)).map(formatTicket),
  };

  // 3. Traemos a los agentes disponibles
  const agentes = await prisma.employee.findMany({
    where: { isActive: true, role: { in: ["VENDEDORA", "SUPERVISOR", "ADMIN"] } },
    select: { id: true, name: true, role: true }
  });

  return <TicketsClient initialData={groupedData} agentes={agentes} />;
}