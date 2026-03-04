import { getTicketsCerrados, getTicketKPIs } from "@/app/actions/tickets";
import TicketsNav from "../_components/TicketsNav";
import CerradosClient from "./_components/CerradosClient";

export default async function TicketsCerradosPage() {
  const [tickets, kpis] = await Promise.all([
    getTicketsCerrados(),
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
            Historial de <span className="text-emerald-400">Soluciones</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 px-4 py-1.5 rounded-full">
          <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">
            Resolución Prom: {kpis.avgHours}h
          </span>
        </div>
      </div>
      <TicketsNav kpis={kpis} />
      <CerradosClient tickets={serialized} />
    </div>
  );
}