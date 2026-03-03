"use client"

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Calendar, Download, TrendingUp, 
  BarChart3, PieChart, Users, Package, 
  ArrowUpRight, ArrowDownRight, Filter, ChevronDown
} from 'lucide-react';
import { products } from '@/lib/products'; 

export default function ReportesPage() {
  const [timeframe, setTimeframe] = useState("Mensual");

  // Datos simulados para las gráficas de barras
  const salesData = [
    { label: "Ene", value: 65 },
    { label: "Feb", value: 85 },
    { label: "Mar", value: 45 },
    { label: "Abr", value: 95 },
    { label: "May", value: 70 },
    { label: "Jun", value: 110 },
  ];

  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      
      {/* HEADER DE INTELIGENCIA */}
      <nav className="flex-none h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-black italic tracking-tighter text-[#FDCB02]">COYOTE <span className="text-white">CRM</span></h1>
          <div className="h-4 w-px bg-white/10" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-500">Reportes & Analítica</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-[#111] rounded-full p-1 border border-white/5">
            {["Semanal", "Mensual", "Anual"].map((t) => (
              <button 
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                  timeframe === t ? 'bg-[#FDCB02] text-black' : 'text-neutral-500 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all">
            <Download size={14} /> PDF
          </button>
        </div>
      </nav>

      {/* CONTENIDO SCROLLABLE */}
      <main className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-8">
        
        {/* FILA 1: KPIs MAESTROS */}
        <div className="grid grid-cols-4 gap-6">
          {[
            { label: "Ventas Totales", val: "$2.4M", change: "+12.5%", up: true, icon: TrendingUp },
            { label: "Kilos Despachados", val: "18,400", change: "+5.2%", up: true, icon: Package },
            { label: "Nuevos Clientes", val: "42", change: "-2.1%", up: false, icon: Users },
            { label: "Ticket Promedio", val: "$58,200", change: "+8.3%", up: true, icon: BarChart3 },
          ].map((kpi, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              key={i} className="bg-[#0a0a0a] border border-white/[0.03] p-6 rounded-[32px] relative overflow-hidden"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">{kpi.label}</p>
              <div className="flex items-baseline gap-3">
                <h3 className="text-3xl font-mono font-bold tracking-tighter">{kpi.val}</h3>
                <span className={`text-[10px] font-bold flex items-center ${kpi.up ? 'text-emerald-500' : 'text-red-500'}`}>
                  {kpi.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {kpi.change}
                </span>
              </div>
              <kpi.icon className="absolute right-6 bottom-6 text-white/[0.02]" size={48} />
            </motion.div>
          ))}
        </div>

        {/* FILA 2: GRÁFICAS */}
        <div className="grid grid-cols-3 gap-6">
          
          {/* Gráfica de Ventas (Barras) */}
          <div className="col-span-2 bg-[#0a0a0a] border border-white/[0.03] p-8 rounded-[40px] flex flex-col">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-lg font-bold tracking-tight">Rendimiento de Ventas</h3>
                <p className="text-xs text-neutral-500 uppercase tracking-widest">Ingresos brutos por mes</p>
              </div>
              <Filter size={16} className="text-neutral-700" />
            </div>
            <div className="flex-1 flex items-end justify-between gap-4 h-48">
              {salesData.map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                  <motion.div 
                    initial={{ height: 0 }} animate={{ height: `${bar.value}%` }}
                    className="w-full bg-[#111] group-hover:bg-[#FDCB02] rounded-t-xl transition-all relative"
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-mono text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {bar.value}k
                    </div>
                  </motion.div>
                  <span className="text-[10px] font-bold text-neutral-600 group-hover:text-white uppercase">{bar.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Telas (Ranking) */}
          <div className="bg-[#0a0a0a] border border-white/[0.03] p-8 rounded-[40px]">
            <h3 className="text-lg font-bold tracking-tight mb-8">Top Telas</h3>
            <div className="space-y-6">
              {[
                { name: "Mezclilla Diablo", share: 85, color: "bg-[#FDCB02]" },
                { name: "Sportok Escolar", share: 62, color: "bg-white" },
                { name: "Oxford Premium", share: 45, color: "bg-blue-500" },
                { name: "Felpa China", share: 38, color: "bg-neutral-700" },
              ].map((fabric, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-neutral-400">{fabric.name}</span>
                    <span>{fabric.share}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} animate={{ width: `${fabric.share}%` }}
                      className={`h-full ${fabric.color}`} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FILA 3: PERFORMANCE DE AGENTES */}
        <div className="bg-[#0a0a0a] border border-white/[0.03] rounded-[40px] overflow-hidden">
          <div className="p-8 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-lg font-bold tracking-tight text-[#FDCB02]">Performance de la Jauría</h3>
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Auditando 4 agentes activos</span>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-[0.3em] text-neutral-600 font-black">
                <th className="px-8 py-4">Agente</th>
                <th className="px-8 py-4">Llamadas</th>
                <th className="px-8 py-4">Cierres</th>
                <th className="px-8 py-4">Conversión</th>
                <th className="px-8 py-4 text-right">Monto Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {[
                { name: "Carlos Mendoza", calls: 450, deals: 32, conv: "7.1%", total: "$1.2M" },
                { name: "Ana S. Ríos", calls: 380, deals: 41, conv: "10.7%", total: "$950k" },
                { name: "Javier Franco", calls: 290, deals: 15, conv: "5.1%", total: "$420k" },
              ].map((agent, i) => (
                <tr key={i} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-8 py-5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-[10px] font-bold text-[#FDCB02] border border-white/5">
                      {agent.name.substring(0,2)}
                    </div>
                    <span className="text-sm font-bold text-neutral-300 group-hover:text-white">{agent.name}</span>
                  </td>
                  <td className="px-8 py-5 font-mono text-xs text-neutral-500">{agent.calls}</td>
                  <td className="px-8 py-5 font-mono text-xs text-neutral-500">{agent.deals}</td>
                  <td className="px-8 py-5">
                    <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded text-[10px] font-bold">{agent.conv}</span>
                  </td>
                  <td className="px-8 py-5 text-right font-mono font-black text-[#FDCB02]">{agent.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #333; }
      `}} />
    </div>
  );
}