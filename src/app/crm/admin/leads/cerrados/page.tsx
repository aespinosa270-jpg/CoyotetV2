import { prisma } from "@/lib/prisma";
import { Download, TrendingUp, Package, User } from "lucide-react";
import CerradosClient from "@/app/crm/admin/leads/cerrados/_components/CerradosClient";

async function getCerradosData() {
  const [ganados, perdidos] = await Promise.all([
    prisma.deal.findMany({
      where: { status: "CERRADO_GANADO" },
      include: {
        employee: { select: { id: true, name: true } },
        product:  { select: { id: true, title: true, sku: true, unit: true } },
        user:     { select: { id: true, name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.deal.findMany({
      where: { status: "CERRADO_PERDIDO" },
      include: {
        employee: { select: { id: true, name: true } },
        product:  { select: { id: true, title: true, sku: true, unit: true } },
        user:     { select: { id: true, name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const totalRevenue = ganados.reduce((s, d) => s + d.value, 0);
  const totalVolumen = ganados.reduce((s, d) => s + (d.quantity ?? 0), 0);

  // Top closer — agente con más valor ganado
  const porAgente = ganados.reduce<Record<string, { name: string; value: number }>>((acc, d) => {
    if (!acc[d.employeeId]) acc[d.employeeId] = { name: d.employee.name, value: 0 };
    acc[d.employeeId].value += d.value;
    return acc;
  }, {});
  const topCloser = Object.values(porAgente).sort((a, b) => b.value - a.value)[0]?.name ?? "—";

  const winRate =
    ganados.length + perdidos.length > 0
      ? Math.round((ganados.length / (ganados.length + perdidos.length)) * 100)
      : 0;

  return { ganados, perdidos, totalRevenue, totalVolumen, topCloser, winRate };
}

export default async function CerradosPage() {
  const data = await getCerradosData();

  const fmt = (v: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency", currency: "MXN", maximumFractionDigits: 0,
    }).format(v);

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">CRM / Pipeline</p>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
            TRATOS <span className="text-emerald-400">CERRADOS</span>
          </h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all text-zinc-400">
          <Download size={13} /> Exportar
        </button>
      </div>

      {/* KPIs reales */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl relative overflow-hidden">
          <TrendingUp className="absolute -right-2 -bottom-2 text-emerald-500/10" size={72} />
          <p className="text-[9px] uppercase font-black tracking-widest text-emerald-500 mb-2">Ingresos Ganados</p>
          <p className="text-2xl font-mono font-bold text-white">{fmt(data.totalRevenue)}</p>
        </div>
        <div className="bg-[#0a0a0a] border border-white/[0.03] p-5 rounded-2xl">
          <p className="text-[9px] uppercase font-black tracking-widest text-zinc-600 mb-2">Volumen Total</p>
          <p className="text-2xl font-mono font-bold text-zinc-200">
            {data.totalVolumen.toLocaleString("es-MX")} <span className="text-xs text-zinc-600 font-sans">uds</span>
          </p>
        </div>
        <div className="bg-[#0a0a0a] border border-white/[0.03] p-5 rounded-2xl">
          <p className="text-[9px] uppercase font-black tracking-widest text-zinc-600 mb-2">Top Closer</p>
          <p className="text-2xl font-mono font-bold text-[#FDCB02] truncate">{data.topCloser}</p>
        </div>
        <div className="bg-[#0a0a0a] border border-white/[0.03] p-5 rounded-2xl">
          <p className="text-[9px] uppercase font-black tracking-widest text-zinc-600 mb-2">Win Rate</p>
          <p className="text-2xl font-mono font-bold text-zinc-200">
            {data.winRate}%
            <span className="text-xs text-zinc-600 font-sans ml-1">
              ({data.ganados.length}G / {data.perdidos.length}P)
            </span>
          </p>
        </div>
      </div>

      {/* Tabla */}
      <CerradosClient ganados={data.ganados} perdidos={data.perdidos} />
    </div>
  );
}