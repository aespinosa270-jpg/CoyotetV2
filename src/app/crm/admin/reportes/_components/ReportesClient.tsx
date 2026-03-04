"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, Package, Users, BarChart3,
  ArrowUpRight, ArrowDownRight, Download, Filter,
} from "lucide-react";

type ReportesData = {
  kpis: {
    ventasActual:    number;
    ventasChange:    number;
    dealsGanados:    number;
    winRate:         number;
    clientesMes:     number;
    clientesChange:  number;
    ticketPromedio:  number;
  };
  ventasPorMes: { label: string; value: number }[];
  topProductos: { name: string; value: number; share: number }[];
  agentes: { id: string; name: string; deals: number; total: number }[];
};

const fmt = (v: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(v);

const fmtShort = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v}`;
};

export default function ReportesClient({ data }: { data: ReportesData }) {
  const [timeframe, setTimeframe] = useState("Mensual");

  const { kpis, ventasPorMes, topProductos, agentes } = data;
  const maxBar = Math.max(...ventasPorMes.map((d) => d.value), 1);

  const kpiCards = [
    {
      label:  "Ventas Totales",
      value:  fmtShort(kpis.ventasActual),
      change: kpis.ventasChange,
      icon:   TrendingUp,
    },
    {
      label:  "Deals Ganados",
      value:  kpis.dealsGanados,
      change: kpis.winRate,
      icon:   BarChart3,
      suffix: `% win rate`,
    },
    {
      label:  "Nuevos Clientes",
      value:  kpis.clientesMes,
      change: kpis.clientesChange,
      icon:   Users,
    },
    {
      label:  "Ticket Promedio",
      value:  fmtShort(kpis.ticketPromedio),
      change: 0,
      icon:   BarChart3,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto min-h-0 space-y-6
      [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">

      {/* Toolbar */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex bg-zinc-900 rounded-full p-1 border border-zinc-800">
          {["Semanal","Mensual","Anual"].map((t) => (
            <button key={t} onClick={() => setTimeframe(t)}
              className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                timeframe === t ? "bg-[#FDCB02] text-black" : "text-zinc-500 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition-all">
          <Download size={13} /> PDF
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-[#0a0a0a] border border-white/[0.03] p-5 rounded-[28px] relative overflow-hidden"
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-3">{kpi.label}</p>
            <h3 className="text-2xl font-mono font-bold tracking-tighter text-white">{kpi.value}</h3>
            {kpi.change !== 0 && (
              <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-bold ${
                kpi.change > 0 ? "text-emerald-400" : "text-red-400"
              }`}>
                {kpi.change > 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {kpi.suffix ?? `${kpi.change > 0 ? "+" : ""}${kpi.change}% vs mes ant.`}
              </div>
            )}
            <kpi.icon className="absolute right-5 bottom-4 text-white/[0.02]" size={44} />
          </motion.div>
        ))}
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-3 gap-4">

        {/* Barras de ventas */}
        <div className="col-span-2 bg-[#0a0a0a] border border-white/[0.03] p-6 rounded-3xl flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">Rendimiento de Ventas</h3>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-0.5">Ingresos por mes — últimos 6 meses</p>
            </div>
            <Filter size={14} className="text-zinc-700" />
          </div>
          <div className="flex items-end justify-between gap-3 h-44">
            {ventasPorMes.map((bar, i) => {
              const pct = maxBar > 0 ? (bar.value / maxBar) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[9px] font-mono text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    {fmtShort(bar.value)}
                  </span>
                  <div className="w-full relative" style={{ height: "140px" }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(pct, 2)}%` }}
                      transition={{ delay: i * 0.08, duration: 0.5 }}
                      className="absolute bottom-0 w-full bg-zinc-800 group-hover:bg-[#FDCB02] rounded-t-xl transition-colors"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-600 group-hover:text-white uppercase transition-colors">
                    {bar.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Productos */}
        <div className="bg-[#0a0a0a] border border-white/[0.03] p-6 rounded-3xl">
          <h3 className="text-sm font-bold tracking-tight text-white mb-6">Top Productos</h3>
          {topProductos.length === 0 ? (
            <p className="text-[10px] text-zinc-700 uppercase tracking-widest text-center py-8">Sin datos</p>
          ) : (
            <div className="space-y-5">
              {topProductos.map((prod, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-zinc-400 truncate max-w-[130px]">{prod.name}</span>
                    <span className="text-zinc-500 font-mono">{prod.share}%</span>
                  </div>
                  <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${prod.share}%` }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                      className="h-full bg-[#FDCB02] rounded-full"
                    />
                  </div>
                  <p className="text-[9px] font-mono text-zinc-700">{fmt(prod.value)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Performance agentes */}
      <div className="bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-sm font-bold text-[#FDCB02]">Performance de la Jauría</h3>
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
            {agentes.length} agente{agentes.length !== 1 ? "s" : ""} con cierres
          </span>
        </div>
        {agentes.length === 0 ? (
          <div className="p-12 text-center text-[10px] text-zinc-700 uppercase tracking-widest">
            Sin datos de cierres aún
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[9px] uppercase tracking-[0.25em] text-zinc-600 font-bold">
                <th className="px-6 py-4">Agente</th>
                <th className="px-6 py-4 text-right">Deals</th>
                <th className="px-6 py-4 text-right">Total Ganado</th>
                <th className="px-6 py-4 text-right">Ticket Prom.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {agentes.map((agent, i) => {
                const ticket = agent.deals > 0
                  ? Math.round(agent.total / agent.deals)
                  : 0;
                return (
                  <motion.tr key={agent.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.06 }}
                    className="hover:bg-white/[0.01] transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[#FDCB02] text-black text-[9px] font-black flex items-center justify-center shrink-0">
                          {agent.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">
                          {agent.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono text-sm text-zinc-400">{agent.deals}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono font-black text-[#FDCB02]">{fmtShort(agent.total)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono text-xs text-zinc-500">{fmtShort(ticket)}</span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
