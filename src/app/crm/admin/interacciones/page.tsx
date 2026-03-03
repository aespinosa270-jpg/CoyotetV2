"use client"

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, PhoneIncoming, PhoneOutgoing, Play, 
  Pause, Download, User, Calendar, Clock, 
  MoreVertical, Filter, Volume2, MessageSquare, 
  Headphones, BarChart3
} from 'lucide-react';
import { products } from '@/lib/products'; 

// --- MOCK DATA: Historial de Llamadas y Mensajes (Coyote Textil) ---
const interactions = [
  { id: "INT-5501", type: "outbound", agent: "Carlos M.", client: "Roberto García", company: "Tácticos Elite", duration: "04:12", status: "Contestada", date: "Hoy, 11:20 AM", fabric: "prod_diablo" },
  { id: "INT-5502", type: "inbound", agent: "Ana S.", client: "Marcos Polo", company: "Uniformes Bajío", duration: "12:45", status: "Contestada", date: "Hoy, 10:05 AM", fabric: "prod_sportok_escolar" },
  { id: "INT-5503", type: "outbound", agent: "Javier F.", client: "Ana Martínez", company: "Hoodie Lab", duration: "00:00", status: "No contestada", date: "Ayer, 4:30 PM", fabric: "prod_felpa_china" },
  { id: "INT-5504", type: "inbound", agent: "Carlos M.", client: "Julio César", company: "Sportswear MX", duration: "08:20", status: "Contestada", date: "Ayer, 2:15 PM", fabric: "prod_alaska" },
  { id: "INT-5505", type: "outbound", agent: "Ana S.", client: "Elena Torres", company: "Boutique Gala", duration: "02:10", status: "Contestada", date: "01 Mar, 9:00 AM", fabric: "lycra_metalica" },
];

export default function InteraccionesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);

  const togglePlay = (id: string) => {
    setPlayingId(playingId === id ? null : id);
  };

  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      
      {/* HEADER DE AUDITORÍA */}
      <nav className="flex-none h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-black italic tracking-tighter text-[#FDCB02]">COYOTE <span className="text-white">CRM</span></h1>
          <div className="h-4 w-px bg-white/10" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-500">Registro de Interacciones</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
            <input 
              type="text" 
              placeholder="Buscar por agente, cliente o tela..." 
              className="bg-[#111] border-none rounded-full py-1.5 pl-9 pr-4 text-xs w-80 focus:ring-1 focus:ring-[#FDCB02] transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-2 text-neutral-400 hover:text-white transition-colors">
            <BarChart3 size={18} />
          </button>
        </div>
      </nav>

      <main className="flex-1 p-6 overflow-hidden flex flex-col gap-6">
        
        {/* RESUMEN DE VOZ (KPIs) */}
        <div className="flex-none grid grid-cols-4 gap-4">
          {[
            { label: "Llamadas Hoy", val: "42", color: "text-white" },
            { label: "Tiempo Aire Total", val: "3h 15m", color: "text-[#FDCB02]" },
            { label: "Tasa de Respuesta", val: "88%", color: "text-emerald-500" },
            { label: "Grabaciones Nuevas", val: "15", color: "text-blue-500" },
          ].map((stat, i) => (
            <div key={i} className="bg-[#0a0a0a] border border-white/[0.03] p-4 rounded-2xl flex flex-col justify-center">
              <p className="text-[8px] uppercase font-black tracking-widest text-neutral-500 mb-1">{stat.label}</p>
              <p className={`text-xl font-mono font-bold ${stat.color}`}>{stat.val}</p>
            </div>
          ))}
        </div>

        {/* TABLA DE INTERACCIONES */}
        <div className="flex-1 bg-[#0a0a0a] border border-white/[0.03] rounded-[40px] overflow-hidden flex flex-col shadow-2xl">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0a0a0a] z-20">
                <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.3em] text-neutral-600 font-black">
                  <th className="px-8 py-6">Tipo / Estado</th>
                  <th className="px-8 py-6">Agente</th>
                  <th className="px-8 py-6">Cliente & Empresa</th>
                  <th className="px-8 py-6">Tela Interés</th>
                  <th className="px-8 py-6">Duración</th>
                  <th className="px-8 py-6 text-right">Grabación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {interactions
                  .filter(i => i.agent.toLowerCase().includes(searchTerm.toLowerCase()) || i.company.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((log, idx) => {
                    const product = products.find(p => p.id === log.fabric);
                    return (
                      <motion.tr 
                        key={log.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="hover:bg-white/[0.01] transition-colors group"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${
                              log.type === 'inbound' ? 'bg-blue-500/10 text-blue-500' : 'bg-[#FDCB02]/10 text-[#FDCB02]'
                            }`}>
                              {log.type === 'inbound' ? <PhoneIncoming size={14} /> : <PhoneOutgoing size={14} />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-neutral-200 uppercase">{log.status}</span>
                              <span className="text-[9px] text-neutral-600 font-mono">{log.date}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-[#FDCB02] border border-white/5">
                                {log.agent.substring(0, 2)}
                             </div>
                             <span className="text-xs font-medium text-neutral-400">{log.agent}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-neutral-200">{log.client}</span>
                            <span className="text-[10px] text-neutral-600 uppercase tracking-widest">{log.company}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-[10px] font-bold text-neutral-500 border border-white/5 px-2 py-1 rounded bg-white/5 uppercase">
                            {product?.title || "General"}
                          </span>
                        </td>
                        <td className="px-8 py-6 font-mono text-xs text-neutral-400">
                          {log.duration}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-4">
                            {log.status === 'Contestada' ? (
                              <>
                                {/* Micro reproductor visual */}
                                {playingId === log.id && (
                                  <div className="flex items-center gap-1">
                                    {[1,2,3,4,3,2,1].map((h, i) => (
                                      <motion.div 
                                        key={i}
                                        animate={{ height: [4, h * 4, 4] }}
                                        transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                                        className="w-0.5 bg-[#FDCB02]"
                                      />
                                    ))}
                                  </div>
                                )}
                                <button 
                                  onClick={() => togglePlay(log.id)}
                                  className={`p-2 rounded-full transition-all ${
                                    playingId === log.id ? 'bg-[#FDCB02] text-black' : 'bg-white/5 text-neutral-400 hover:text-white'
                                  }`}
                                >
                                  {playingId === log.id ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                                </button>
                                <button className="p-2 text-neutral-600 hover:text-white transition-colors">
                                  <Download size={14} />
                                </button>
                              </>
                            ) : (
                              <span className="text-[9px] font-bold text-neutral-800 uppercase italic tracking-tighter">Sin audio</span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #FDCB02; }
        body { overflow: hidden; }
      `}} />
    </div>
  );
}