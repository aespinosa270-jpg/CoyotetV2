import { getTicketsPendientes, getTicketKPIs } from "@/app/actions/tickets";
import TicketsNav from "../_components/TicketsNav";
import PendientesClient from "./_components/PendientesClient";

export default async function PendientesPage() {
  const [tickets, kpis] = await Promise.all([
    getTicketsPendientes(),
    getTicketKPIs(),
  ]);

  const serialized = tickets.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="flex items-end justify-between shrink-0">
        <div>
          <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">CRM / Soporte</p>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
            Tickets <span className="text-amber-400">En Revisión</span>
          </h1>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
          <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest">
            En Revisión: {kpis.pendientes}
          </span>
        </div>
      </div>
      <TicketsNav kpis={kpis} />
      <PendientesClient tickets={serialized} />
    </div>
  );
}