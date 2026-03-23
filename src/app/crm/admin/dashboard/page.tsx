import { getAdminStats } from "@/app/actions/dashboard";
import { TrendingUp, Package, Users, DollarSign, ArrowUpRight, Activity } from "lucide-react";
import SalesChart from "./_components/SalesChart";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const stats = await getAdminStats();

  const kpis = [
    { label: "Revenue Total (Ganado)", value: `$${(stats.revenueTotal / 1000).toFixed(1)}k`, icon: TrendingUp, color: "text-emerald-400" },
    { label: "Valor en Bodega", value: `$${(stats.inventoryValue / 1000).toFixed(1)}k`, icon: Package, color: "text-[#FDCB02]" },
    { label: "Oportunidades Totales", value: stats.totalDeals, icon: DollarSign, color: "text-sky-400" },
    { label: "SKUs en Existencia", value: stats.activeSkus, icon: Users, color: "text-purple-400" },
  ];

  return (
    <div className="h-full flex flex-col gap-8 p-8 font-mono bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase mb-1 font-black">Consola de Mando / Analytics</p>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white italic">
            COYOTE <span className="text-[#FDCB02]">INSIGHTS</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <Activity size={12} className="text-emerald-500 animate-pulse" />
          <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Live System Feed</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
            <kpi.icon className={`absolute -right-2 -bottom-2 w-20 h-20 opacity-5 transition-transform group-hover:scale-110 ${kpi.color}`} />
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-4 font-black">{kpi.label}</p>
            <p className={`text-3xl font-black tracking-tighter ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Main Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfica de Tendencias */}
        <div className="lg:col-span-2 bg-zinc-900/30 border border-zinc-800 rounded-3xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-400" /> Flujo de Ventas (7D)
            </h3>
            <span className="text-[10px] text-zinc-600 font-mono italic">Valores expresados en MXN</span>
          </div>
          <SalesChart data={stats.dailySales} />
        </div>

        {/* Status de Almacén Rápido */}
        <div className="bg-[#FDCB02] rounded-3xl p-8 text-black flex flex-col justify-between shadow-xl shadow-[#FDCB02]/5">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8">Bodega Status</h3>
            <p className="text-5xl font-black tracking-tighter italic leading-none mb-4">
              CAPITAL <br />ACTIVO
            </p>
            <p className="text-xs font-bold leading-relaxed opacity-70 uppercase tracking-tight">
              El inventario físico representa el {((stats.inventoryValue / (stats.inventoryValue + stats.revenueTotal)) * 100).toFixed(0)}% de tu valor de mercado actual en sistema.
            </p>
          </div>
          <div className="pt-8 border-t border-black/10">
            <p className="text-[10px] font-black uppercase tracking-widest mb-1">Valoración Total</p>
            <p className="text-3xl font-black font-mono leading-none">${stats.inventoryValue.toLocaleString()}</p>
          </div>
        </div>

        {/* Ranking de Agentes (Ahora abajo para dar más espacio) */}
        <div className="lg:col-span-3 bg-zinc-900/30 border border-zinc-800 rounded-3xl p-8">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 mb-8 flex items-center gap-2">
            <ArrowUpRight size={14} className="text-[#FDCB02]" /> Ranking de Ventas por Agente
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {stats.agentPerformance.map((agent, idx) => (
              <div key={agent.name} className="flex flex-col gap-2 p-4 bg-black/20 border border-white/5 rounded-2xl group hover:border-[#FDCB02]/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-800 font-black italic text-2xl group-hover:text-[#FDCB02]/20 transition-colors">0{idx + 1}</span>
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] font-black text-white italic">
                    {agent.name.split(' ').map(n => n[0]).join('')}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-black text-white uppercase truncate">{agent.name}</p>
                  <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-tighter">{agent.count} deals ganados</p>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-lg font-black text-emerald-400 font-mono">${agent.value.toLocaleString()}</p>
                  <div className="w-full h-1 bg-zinc-800 mt-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500" 
                      style={{ width: `${(agent.value / stats.revenueTotal) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}