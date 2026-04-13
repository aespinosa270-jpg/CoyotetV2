"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, TrendingDown, MessageSquare, AlertTriangle, ChevronDown, CheckCircle2 } from "lucide-react";

type Flag = {
  id: string;
  timestamp: string;
  metadata: any;
  employee: { name: string; role: string } | null;
};

type Ranking = { name: string; role: string; count: number };
type QAData = { flags: Flag[]; ranking: Ranking[] };

export default function QualityDashboardClient({ data }: { data: QAData }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getCategoryColor = (category: string) => {
    if (category === "LENGUAJE") return "text-orange-400 bg-orange-500/10 border-orange-500/30";
    if (category === "PROMESA_FALSA") return "text-red-400 bg-red-500/10 border-red-500/30";
    if (category === "DESCUENTO_NO_AUTORIZADO") return "text-purple-400 bg-purple-500/10 border-purple-500/30";
    return "text-zinc-400 bg-zinc-500/10 border-zinc-500/30";
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-12rem)] min-h-[600px]">
      
      {/* ─── COLUMNA IZQUIERDA: RANKING ─── */}
      <div className="w-full xl:w-1/3 flex flex-col gap-6">
        <div className="bg-[#111111] text-white p-6 rounded-3xl relative overflow-hidden shadow-xl shrink-0">
          <div className="absolute -right-4 -top-4 opacity-5"><ShieldAlert size={100} className="text-[#FDCB02]" /></div>
          <p className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase mb-2 font-bold">Total Infracciones (30d)</p>
          <p className="text-6xl font-black text-red-500">{data.flags.length}</p>
        </div>

        <div className="bg-[#111111] text-white rounded-3xl p-6 flex-1 flex flex-col min-h-0 shadow-xl">
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4 shrink-0">
            <TrendingDown size={16} className="text-red-500" />
            <h2 className="text-xs tracking-[0.2em] text-zinc-300 uppercase font-bold">Agentes en Riesgo</h2>
          </div>
          <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-3">
            {data.ranking.length === 0 ? (
              <p className="text-[10px] text-zinc-600 text-center uppercase tracking-widest mt-10 font-bold">Equipo impecable.</p>
            ) : (
              data.ranking.map((agent, idx) => (
                <div key={idx} className="flex justify-between items-center bg-[#1a1a1a] p-3 rounded-2xl border border-white/5">
                  <div>
                    <p className="text-xs font-black text-white">{agent.name}</p>
                    <p className="text-[9px] text-zinc-500 uppercase font-mono">{agent.role}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-black text-red-400">{agent.count}</span>
                    <p className="text-[8px] uppercase tracking-widest text-zinc-600">Flags</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── COLUMNA DERECHA: FEED DE AUDITORÍA ─── */}
      <div className="w-full xl:w-2/3 bg-[#111111] text-white rounded-3xl flex flex-col overflow-hidden shadow-xl">
        <div className="p-6 border-b border-white/5 bg-[#0a0a0a] shrink-0 flex justify-between items-center">
          <h3 className="text-xs tracking-[0.2em] text-zinc-400 uppercase font-black flex items-center gap-2">
            <AlertTriangle size={14} className="text-[#FDCB02]" /> Perro Guardián (IA)
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          {data.flags.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4">
              <CheckCircle2 size={48} className="opacity-20 text-emerald-500" />
              <p className="text-[10px] uppercase tracking-widest font-black">No hay infracciones detectadas</p>
            </div>
          ) : (
            data.flags.map((flag) => {
              const meta = flag.metadata || {};
              const category = meta.summary?.replace("Infracción detectada: ", "") || "DESCONOCIDO";
              const isExpanded = expandedId === flag.id;

              return (
                <motion.div 
                  key={flag.id} 
                  layout
                  className={`border rounded-2xl overflow-hidden transition-colors ${isExpanded ? 'bg-[#1a1a1a] border-[#FDCB02]/30' : 'bg-[#0a0a0a] border-white/5 hover:border-white/10'}`}
                >
                  <button 
                    onClick={() => setExpandedId(isExpanded ? null : flag.id)}
                    className="w-full text-left p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex flex-col">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border mb-1 w-fit ${getCategoryColor(category)}`}>
                          {category}
                        </span>
                        <p className="text-xs font-bold text-white">{flag.employee?.name || "Desconocido"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0">
                      <p className="text-[10px] font-mono text-zinc-500">
                        {new Date(flag.timestamp).toLocaleString("es-MX", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <ChevronDown size={16} className={`text-zinc-600 transition-transform ${isExpanded ? 'rotate-180 text-[#FDCB02]' : ''}`} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/5 bg-[#111111]"
                      >
                        <div className="p-4 md:p-6 space-y-4">
                          <div>
                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mb-1.5 flex items-center gap-1">
                              <MessageSquare size={10} /> Mensaje Original
                            </p>
                            <p className="text-sm text-zinc-300 font-mono bg-[#0a0a0a] p-3 rounded-xl border border-white/5 break-words">
                              "{meta.originalText || "No disponible"}"
                            </p>
                          </div>

                          <div>
                            <p className="text-[9px] text-[#FDCB02]/70 uppercase tracking-widest font-black mb-1.5 flex items-center gap-1">
                              🤖 Análisis IA
                            </p>
                            <p className="text-xs text-red-400 bg-red-500/5 p-3 rounded-xl border border-red-500/10 leading-relaxed">
                              {meta.aiReason || "Infracción detectada según reglas de negocio."}
                            </p>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 pt-2">
                            <button className="text-[9px] font-black uppercase tracking-widest px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors">
                              Ignorar (Falso Positivo)
                            </button>
                            <button className="text-[9px] font-black uppercase tracking-widest px-4 py-2.5 bg-[#FDCB02] hover:bg-yellow-400 text-black rounded-lg transition-colors shadow-lg shadow-[#FDCB02]/20">
                              Aplicar Sanción
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
      `}} />
    </div>
  );
}