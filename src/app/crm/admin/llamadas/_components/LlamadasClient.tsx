"use client"

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, PhoneIncoming, PhoneOutgoing, Play, 
  Pause, Download, Filter, BarChart3, PhoneMissed
} from 'lucide-react';
import { products } from '@/lib/products'; 

// Lo ideal es tener esto en un archivo de tipos, pero lo dejo aquí para que compile directo
export interface CallLog {
  id: string;
  type: string;
  agent: string;
  client: string;
  company: string;
  duration: string;
  status: string;
  date: string;
  fabric: string | null;
  audioUrl?: string; 
}

interface LlamadasClientProps {
  initialData: CallLog[];
}

export default function LlamadasClient({ initialData = [] }: LlamadasClientProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Filtrado de datos (seguro contra nulos)
  const filteredCalls = initialData.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      (c.agent && c.agent.toLowerCase().includes(term)) || 
      (c.company && c.company.toLowerCase().includes(term)) ||
      (c.id && c.id.toLowerCase().includes(term)) ||
      (c.client && c.client.toLowerCase().includes(term))
    );
  });

  // KPIs dinámicos calculados a partir de initialData
  const totalCalls = initialData.length;
  const answeredCalls = initialData.filter(c => c.status === 'contestada' || c.status === 'completed').length;
  const answerRate = totalCalls > 0 ? ((answeredCalls / totalCalls) * 100).toFixed(1) : 0;

  // Función de utilidad para manejar el play (aquí conectarías tu lógica de audio real)
  const handlePlayToggle = (id: string, audioUrl?: string) => {
    if (playingId === id) {
      setPlayingId(null);
      // Lógica para pausar audio real: audio.pause()
    } else {
      setPlayingId(id);
      // Lógica para reproducir audio real: new Audio(audioUrl).play()
      if (audioUrl) console.log("Reproduciendo:", audioUrl);
    }
  };

  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      
      {/* BARRA SUPERIOR DE COMANDO */}
      <nav className="flex-none h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-black italic tracking-tighter text-[#FDCB02]">COYOTE <span className="text-white">CRM</span></h1>
          <div className="h-4 w-px bg-white/10" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-500">Monitor de Llamadas</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
            <input 
              type="text" 
              placeholder="Buscar agente, cliente o folio..." 
              className="bg-[#111] border-none rounded-full py-1.5 pl-9 pr-4 text-xs w-72 focus:ring-1 focus:ring-[#FDCB02] transition-all text-white placeholder-neutral-700 outline-none"
              onChange={(e) => setSearchTerm(e.target.value)}
              value={searchTerm || ""} // <-- Aquí está la corrección clave
            />
          </div>
          <button className="p-2 text-neutral-400 hover:text-white transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </nav>

      {/* MÉTRICAS DE TELEFONÍA (KPIs) */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col gap-6">
        
        <div className="flex-none grid grid-cols-4 gap-4">
          <div className="bg-[#0a0a0a] border border-white/[0.03] p-5 rounded-3xl relative overflow-hidden group">
            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-neutral-500 mb-2">Total Llamadas</p>
            <p className="text-3xl font-mono font-bold text-white">{totalCalls}</p>
            <BarChart3 className="absolute -right-2 -bottom-2 text-white/[0.02] group-hover:text-white/[0.05] transition-all" size={60} />
          </div>
          <div className="bg-[#0a0a0a] border border-white/[0.03] p-5 rounded-3xl">
            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-neutral-500 mb-2">Tasa de Respuesta</p>
            <p className="text-3xl font-mono font-bold text-emerald-500">{answerRate}%</p>
          </div>
          <div className="bg-[#0a0a0a] border border-white/[0.03] p-5 rounded-3xl">
            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-neutral-500 mb-2">Conversaciones</p>
            <p className="text-3xl font-mono font-bold text-[#FDCB02]">{answeredCalls}</p> 
          </div>
          <div className="bg-[#0a0a0a] border border-white/[0.03] p-5 rounded-3xl">
            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-neutral-500 mb-2">Llamadas en Fila</p>
            <p className="text-3xl font-mono font-bold text-blue-500">0</p>
          </div>
        </div>

        {/* LOG DE LLAMADAS */}
        <div className="flex-1 bg-[#0a0a0a] border border-white/[0.03] rounded-[40px] overflow-hidden flex flex-col shadow-2xl">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.3em] text-neutral-600 font-black">
                  <th className="px-8 py-6">Tipo / Folio</th>
                  <th className="px-8 py-6">Agente</th>
                  <th className="px-8 py-6">Cliente & Empresa</th>
                  <th className="px-8 py-6">Producto Sugerido</th>
                  <th className="px-8 py-6">Duración</th>
                  <th className="px-8 py-6 text-right">Grabación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-neutral-600 font-mono text-sm">
                      No se encontraron registros.
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map((call, idx) => {
                    // Cuidado aquí: asegúrate de que 'products' esté bien exportado de '@/lib/products'
                    const product = products?.find(p => p.id === call.fabric);
                    const isAnswered = call.status === 'contestada' || call.status === 'completed';

                    return (
                      <motion.tr 
                        key={call.id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="hover:bg-white/[0.01] transition-colors group"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-2xl ${
                              isAnswered ? 'bg-white/5 text-neutral-400' : 'bg-red-500/10 text-red-500'
                            }`}>
                              {call.type === 'entrante' || call.type === 'inbound' ? <PhoneIncoming size={16} /> : <PhoneOutgoing size={16} />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-mono font-bold text-neutral-500">#{call.id}</span>
                              <span className="text-[10px] text-neutral-700">{call.date}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-xs font-bold text-neutral-400">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center border border-white/5 text-[10px] text-[#FDCB02] uppercase">
                              {call.agent ? call.agent.substring(0,1) : '?'}
                            </div>
                            {call.agent || 'Desconocido'}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-neutral-200">{call.client || 'Sin nombre'}</span>
                            <span className="text-[10px] text-neutral-500 uppercase tracking-widest">{call.company || 'Sin empresa'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 font-mono text-[10px]">
                          {product ? (
                            <span className="text-[#FDCB02] bg-[#FDCB02]/5 px-2 py-1 rounded border border-[#FDCB02]/10 uppercase font-black tracking-tighter">
                              {product.title}
                            </span>
                          ) : (
                            <span className="text-neutral-700 italic">No especificado</span>
                          )}
                        </td>
                        <td className="px-8 py-6 font-mono text-xs text-neutral-500">
                          {call.duration || '00:00'}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {isAnswered ? (
                              <>
                                <AnimatePresence>
                                  {playingId === call.id && (
                                    <motion.div 
                                      initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }}
                                      className="flex items-center gap-1"
                                    >
                                      {[1,2,3,2,1].map((h, i) => (
                                        <motion.div 
                                          key={i}
                                          animate={{ height: [4, h * 6, 4] }}
                                          transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                                          className="w-0.5 bg-[#FDCB02]"
                                        />
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                                <button 
                                  onClick={() => handlePlayToggle(call.id, call.audioUrl)}
                                  className={`p-2.5 rounded-full transition-all ${
                                    playingId === call.id ? 'bg-[#FDCB02] text-black shadow-[0_0_15px_rgba(253,203,2,0.3)]' : 'bg-white/5 text-neutral-500 hover:text-white'
                                  }`}
                                >
                                  {playingId === call.id ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                                </button>
                                {call.audioUrl && (
                                  <a href={call.audioUrl} download className="p-2 text-neutral-600 hover:text-white cursor-pointer">
                                    <Download size={14} />
                                  </a>
                                )}
                              </>
                            ) : (
                              <div className="flex items-center gap-1 text-red-500/40 text-[9px] font-black uppercase italic">
                                <PhoneMissed size={12} /> Sin Audio
                              </div>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #333; }
        body { overflow: hidden; }
      `}} />
    </div>
  );
}