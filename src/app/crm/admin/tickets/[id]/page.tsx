import { notFound } from "next/navigation";
import { getTicketById } from "@/app/actions/tickets";
import TicketDetalleClient from "./_components/TicketDetalleClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function TicketDetallePage({ params }: { params: { id: string } }) {
  const ticket = await getTicketById(params.id);

  if (!ticket) {
    notFound();
  }

  // 🔥 AQUÍ ESTÁ LA MAGIA: Serializamos las fechas y limpiamos los nulls de los nombres
  // para que el Client Component (que es estricto) reciba los strings que espera.
  const serializedTicket = {
    ...ticket,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    user: {
      ...ticket.user,
      // Si el cliente no tiene nombre, usamos su correo para que no truene
      name: ticket.user.name ?? ticket.user.email,
    },
    messages: ticket.messages.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      user: m.user ? { ...m.user, name: m.user.name ?? "Cliente" } : null,
    }))
  };

  // 🔥 NOTA: Aquí deberías sacar el ID del empleado logueado desde tu sesión (NextAuth)
  // Por ahora pondremos un ID simulado para que la UI funcione y puedas probar el chat.
  const currentEmployeeId = "id-del-agente-logueado"; 

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Header Back Button */}
      <div className="shrink-0">
        <Link href="/crm/admin/tickets/abiertos" className="text-zinc-500 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors w-fit">
          <ArrowLeft size={14} /> Volver a Tickets
        </Link>
      </div>

      {/* Título */}
      <div className="flex items-end justify-between shrink-0">
        <div>
          <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">Ticket {ticket.ticketNumber}</p>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
            {ticket.subject}
          </h1>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
          <span className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">
            {ticket.status}
          </span>
        </div>
      </div>

      <TicketDetalleClient ticket={serializedTicket} currentEmployeeId={currentEmployeeId} />
    </div>
  );
}