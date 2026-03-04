import { getDealsByStatus, getPipelineKPIs, getActiveAgents, getActiveProducts } from "@/app/actions/deals";
import KanbanBoard from "./_components/KanbanBoard";

export default async function LeadsPage() {
  const [columns, kpis, agents, products] = await Promise.all([
    getDealsByStatus(),
    getPipelineKPIs(),
    getActiveAgents(),
    getActiveProducts(),
  ]);

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-white/10 pb-4 shrink-0">
        <div>
          <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">CRM</p>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
            COYOTE <span className="text-[#FDCB02]">CRM</span>
          </h1>
        </div>
        <div className="flex gap-3">
          {[
            { label: "Deals",      value: kpis.total                                        },
            { label: "Win Rate",   value: `${kpis.winRate}%`                                },
            { label: "Pipeline",   value: `$${(kpis.valorTotal  / 1000).toFixed(0)}k`       },
            { label: "Ganado",     value: `$${(kpis.valorGanado / 1000).toFixed(0)}k`       },
          ].map((k) => (
            <div key={k.label} className="bg-[#0a0a0a] border border-white/[0.03] px-4 py-2 rounded-xl text-right">
              <p className="text-[8px] text-zinc-600 uppercase tracking-widest">{k.label}</p>
              <p className="text-lg font-black text-white font-mono">{k.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Board */}
      <KanbanBoard initialColumns={columns} agents={agents} products={products} />
    </div>
  );
}