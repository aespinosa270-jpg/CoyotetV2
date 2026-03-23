import { getAgentById } from "@/app/actions/agents";
import { notFound } from "next/navigation";
import { ArrowLeft, ShoppingBag, Target, Mail } from "lucide-react";
import Link from "next/link";

// ─── MAGIC TYPE INFERENCE ──────────────────────────────────────────────────
// Extraemos el tipo real que regresa la base de datos automáticamente
type AgentWithDeals = NonNullable<Awaited<ReturnType<typeof getAgentById>>>;
type Deal = AgentWithDeals['deals'][number];

export const dynamic = 'force-dynamic';

const fmt = (v: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(v);

export default async function AgenteDetallePage({ params }: { params: { id: string } }) {
  const agent = await getAgentById(params.id);

  if (!agent) notFound();

  // Cálculos dinámicos
  const wonDeals = agent.deals.filter(d => d.status === "CERRADO_GANADO");
  const totalRevenue = wonDeals.reduce((acc, d) => acc + Number(d.value), 0);
  const winRate = agent.deals.length > 0 
    ? Math.round((wonDeals.length / agent.deals.length) * 100) 
    : 0;

  return (
    <div className="space-y-8 font-mono max-w-[1400px] mx-auto p-8 bg-[#0a0a0a] min-h-screen text-white">
      {/* Header / Breadcrumb */}
      <div className="space-y-4">
        <Link href="/crm/admin/agentes" className="text-zinc-600 hover:text-[#FDCB02] transition-colors text-[10px] flex items-center gap-2 tracking-[0.2em] font-black uppercase">
          <ArrowLeft size={12} /> Volver a Fuerza de Ventas
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-[#FDCB02] text-black flex items-center justify-center text-3xl font-black italic shadow-2xl shadow-[#FDCB02]/10">
              {agent.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none">{agent.name}</h1>
              <div className="flex items-center gap-4 mt-2">
                 <span className="text-zinc-500 text-xs flex items-center gap-1.5 font-bold"><Mail size={12}/> {agent.email}</span>
                 <span className="bg-zinc-900 border border-white/5 px-3 py-1 rounded-full text-[9px] font-black text-[#FDCB02] uppercase tracking-widest">{agent.role}</span>
              </div>
            </div>
          </div>
          <div className="text-right border-l border-white/5 pl-8 hidden lg:block">
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">Comisión Pactada</p>
            <p className="text-3xl font-black text-white italic">{agent.commissionRate}%</p>
          </div>
        </div>
      </div>

      {/* KPIs del Agente */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Revenue Generado", value: fmt(totalRevenue), color: "text-emerald-400" },
          { label: "Win Rate", value: `${winRate}%`, color: "text-[#FDCB02]" },
          { label: "Deals Ganados", value: wonDeals.length, color: "text-white" },
          { label: "Total Oportunidades", value: agent.deals.length, color: "text-zinc-500" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-zinc-900/30 border border-white/5 p-6 rounded-2xl">
            <p className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.2em] mb-2">{kpi.label}</p>
            <p className={`text-2xl font-black tracking-tighter ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Historial de Deals */}
      <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-8 py-6 border-b border-white/5 bg-zinc-950/50 flex justify-between items-center text-zinc-400 uppercase tracking-widest text-[10px] font-black">
          Historial de Cierres
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-zinc-600 border-b border-white/5 bg-zinc-950/20">
                <th className="px-8 py-5 font-black">Cliente / Empresa</th>
                <th className="px-8 py-5 font-black">Producto</th>
                <th className="px-8 py-5 font-black">Estado</th>
                <th className="px-8 py-5 font-black text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {agent.deals.map((deal: Deal) => (
                <tr key={deal.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-white group-hover:text-[#FDCB02] transition-colors uppercase">{deal.company}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5 tracking-tighter italic">{deal.title}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <ShoppingBag size={12} className="text-zinc-700" />
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">
                        {deal.product?.title ?? "Genérico"}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-sm border ${
                      deal.status === 'CERRADO_GANADO' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      deal.status === 'CERRADO_PERDIDO' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                      'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}>
                      {deal.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right font-mono font-black text-zinc-200">
                    {fmt(Number(deal.value))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}