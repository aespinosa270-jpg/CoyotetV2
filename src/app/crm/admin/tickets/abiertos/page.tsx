import { getTicketsAbiertos, getTicketKPIs } from "@/app/actions/tickets";
import TicketsNav from "../_components/TicketsNav";
import AbiertosClient from "./_components/AbiertosClient";

export default async function AbiertosPage() {
  const [tickets, kpis] = await Promise.all([
    getTicketsAbiertos(),
    getTicketKPIs(),
  ]);

  const serialized = tickets.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    user: {
      ...t.user,
      name: t.user.name ?? t.user.email,
    },
  }));

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="flex items-end justify-between shrink-0">
        <div>
          <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">CRM / Soporte</p>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
            Tickets <span className="text-red-400">Abiertos</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {kpis.criticos > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg">
              <span className="text-red-400 text-[10px] font-black uppercase tracking-widest">
                {kpis.criticos} Urgente{kpis.criticos > 1 ? "s" : ""}
              </span>
            </div>
          )}
          <div className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
            <span className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">
              Total: {kpis.abiertos}
            </span>
          </div>
        </div>
      </div>
      <TicketsNav kpis={kpis} />
      <AbiertosClient tickets={serialized} />
    </div>
  );
}