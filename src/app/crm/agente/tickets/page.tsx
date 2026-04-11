// src/app/crm/agente/tickets/page.tsx
import { getMisTickets } from "@/app/actions/tickets";
import MisTicketsClient from "./_components/MisTicketsClient";

export const dynamic = 'force-dynamic';

export default async function TicketsPage() {
  const tickets = await getMisTickets();

  // Serializa Date → string para pasarlos como props a Client Component
  const serialized = tickets.map((t: any) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    user: t.user
      ? { ...t.user, name: t.user.name ?? t.user.email }
      : null,
    order: t.order ? { id: t.order.id, orderNumber: String(t.order.orderNumber) } : null,
  })) as any;

  return (
    <div className="h-full flex flex-col p-6 bg-[#0a0a0a] overflow-hidden">
      {/* Header del Agente */}
      <div className="mb-6 shrink-0">
        <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">Operación</p>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
          Bandeja de <span className="text-[#FDCB02]">Tickets</span>
        </h1>
      </div>

      <MisTicketsClient tickets={serialized} />
    </div>
  );
}