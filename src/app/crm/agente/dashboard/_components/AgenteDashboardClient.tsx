"use client";

import { motion } from "framer-motion";
import { DollarSign, Target, TrendingUp, Trophy, AlertCircle, Building2, ExternalLink } from "lucide-react";
import Link from "next/link";

const fmt = (v: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

export default function AgenteDashboardClient({ data }: { data: any }) {
  const { agent, kpis, activePipeline, recentHistory } = data;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* ─── HEADER (Motivacional) ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-6">
        <div>
          <p className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase mb-1 font-black">Portal de Ventas</p>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">
            HOLA, <span className="text-[#FDCB02]">{agent.name.split(' ')[0]}</span>
          </h1>
        </div>
        <div className="text-left md:text-right bg-zinc-900/50 border border-white/5 px-6 py-3 rounded-2xl">
          <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">Tu Tasa de Comisión</p>
          <p className="text-xl font-black text-white italic flex items-center gap-2 justify-start md:justify-end">
            {agent.commissionRate}% <Target size={16} className="text-[#FDCB02]" />
          </p>
        </div>
      </div>

      {/* ─── KPIs DE NÓMINA (Lo que le importa al vendedor) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Comisión Asegurada */}
        <div className="bg-[#0a0a0a] border border-emerald-500/20 shadow-[0_0_30px_-10px_rgba(16,185,129,0.15)] p-6 rounded-[2rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><DollarSign size={64} /></div>
          <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Trophy size={12} className="text-emerald-500" /> Comisión Asegurada
          </p>
          <p className="text-4xl font-black font-mono text-emerald-400">{fmt(kpis.commissionEarned)}</p>
          <p className="text-[10px] text-zinc-600 mt-2 font-bold uppercase tracking-widest">
            De {fmt(kpis.wonValue)} vendidos
          </p>
        </div>

        {/* Comisión en Juego (Prospectos) */}
        <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-[2rem]">
          <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <TrendingUp size={12} className="text-sky-400" /> Comisión en Juego
          </p>
          <p className="text-3xl font-black font-mono text-sky-400">{fmt(kpis.potentialCommission)}</p>
          <p className="text-[10px] text-zinc-600 mt-2 font-bold uppercase tracking-widest">
            En {kpis.activeCount} deals activos
          </p>
        </div>

        {/* Win Rate */}
        <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-[2rem]">
          <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Target size={12} className="text-[#FDCB02]" /> Win Rate Personal
          </p>
          <p className="text-3xl font-black font-mono text-white">{kpis.winRate}%</p>
          <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-[#FDCB02]" style={{ width: `${kpis.winRate}%` }} />
          </div>
        </div>

        {/* Action Card */}
        <div className="bg-[#FDCB02] border border-yellow-400 p-6 rounded-[2rem] flex flex-col justify-center items-start text-black">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-70">Acción Rápida</p>
          <p className="text-lg font-black italic leading-tight mb-4 tracking-tighter">¿Tienes un nuevo cliente?</p>
          <Link 
            href="/crm/agente/cotizaciones/nueva" 
            className="bg-black text-[#FDCB02] text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl w-full text-center hover:bg-zinc-900 transition-colors"
          >
            Generar Cotización
          </Link>
        </div>
      </div>

      {/* ─── LISTAS DE TRABAJO ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Columna Izquierda: PIPELINE ACTIVO (A quién marcarle) */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-[500px]">
          <div className="p-6 border-b border-white/5 bg-zinc-950/50 flex justify-between items-center shrink-0">
            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <AlertCircle size={14} className="text-sky-400" /> Pipeline Activo
            </h3>
            <span className="text-[9px] bg-zinc-900 text-zinc-500 px-2 py-1 rounded font-bold">{activePipeline.length} Deals</span>
          </div>
          
          <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-3">
            {activePipeline.length === 0 ? (
              <p className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-10">Tu pipeline está vacío. ¡A prospectar!</p>
            ) : (
              activePipeline.map((deal: any, idx: number) => (
                <motion.div 
                  key={deal.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                  className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl hover:bg-zinc-900 transition-colors flex justify-between items-center group"
                >
                  <div>
                    <p className="text-xs font-black text-white uppercase line-clamp-1">{deal.title}</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1.5 mt-1">
                      <Building2 size={10} className="text-[#FDCB02]" /> {deal.company}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black font-mono text-sky-400">{fmt(Number(deal.value))}</p>
                    <span className="text-[8px] uppercase tracking-widest font-black text-zinc-500 border border-white/5 bg-black px-2 py-0.5 rounded">
                      {deal.status}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Columna Derecha: HISTORIAL RECIENTE */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-[500px]">
          <div className="p-6 border-b border-white/5 bg-zinc-950/50 flex justify-between items-center shrink-0">
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Trophy size={14} className="text-zinc-600" /> Historial Reciente
            </h3>
          </div>
          
          <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-3">
            {recentHistory.length === 0 ? (
              <p className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-10">Aún no hay cierres registrados.</p>
            ) : (
              recentHistory.map((deal: any, idx: number) => (
                <motion.div 
                  key={deal.id}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                  className="bg-zinc-900/30 border border-white/5 p-4 rounded-2xl flex justify-between items-center"
                >
                  <div>
                    <p className="text-xs font-black text-zinc-300 uppercase line-clamp-1">{deal.title}</p>
                    <p className="text-[10px] text-zinc-600 font-mono mt-1">
                      {new Date(deal.updatedAt).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className={`text-sm font-black font-mono ${deal.status === 'CERRADO_GANADO' ? 'text-emerald-500' : 'text-red-500/50'}`}>
                      {deal.status === 'CERRADO_GANADO' ? '+' : ''}{fmt(Number(deal.value))}
                    </p>
                    <span className={`text-[8px] uppercase tracking-widest font-black px-2 py-0.5 rounded ${
                      deal.status === 'CERRADO_GANADO' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500/50'
                    }`}>
                      {deal.status === 'CERRADO_GANADO' ? 'GANADO' : 'PERDIDO'}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #333; }
      `}} />
    </div>
  );
}