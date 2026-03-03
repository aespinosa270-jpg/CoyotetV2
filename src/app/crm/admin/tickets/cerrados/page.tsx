"use client"

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, CheckCircle2, ChevronRight, 
  Package, User, MessageSquare, MoreVertical,
  History, Trophy, ShieldCheck
} from 'lucide-react';
import { products } from '@/lib/products'; 

// --- MOCK DATA: Tickets Resueltos (Histórico Coyote Textil) ---
const resolvedTickets = [
  { id: "TK-101", productId: "prod_diablo", company: "Uniformes Pro", issue: "Cambio de 3 rollos por defecto de fábrica", resolution: "Material sustituido y enviado", timeToResolve: "1d 4h", agent: "Carlos M.", date: "02 Mar" },
  { id: "TK-102", productId: "prod_alaska", company: "Sportswear MX", issue: "Error en factura de lote de importación", resolution: "Nota de crédito aplicada", timeToResolve: "2h 15m", agent: "Ana S.", date: "01 Mar" },
  { id: "TK-105", productId: "prod_sportok_escolar", company: "Textiles Bajío", issue: "Solicitud de muestra de catálogo 2026", resolution: "Muestrario físico entregado", timeToResolve: "3d 0h", agent: "Javier F.", date: "28 Feb" },
  { id: "TK-108", productId: "prod_felpa_china", company: "Hoodie Lab", issue: "Duda sobre rendimiento por kilo", resolution: "Ficha técnica enviada y explicada", timeToResolve: "45m", agent: "Ana S.", date: "27 Feb" },
  { id: "TK-110", productId: "lycra_metalica", company: "Disfraces Gala", issue: "Faltante de 2 metros en rollo", resolution: "Reembolso parcial autorizado", timeToResolve: "5h 30m", agent: "Carlos M.", date: "26 Feb" },
];

export default function TicketsResueltosPage() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      
      {/* NAVEGACIÓN DE SUBDIVISIONES */}
      <nav className="flex-none h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-black italic tracking-tighter text-[#FDCB02]">COYOTE <span className="text-white">CRM</span></h1>
          <div className="h-4 w-px bg-white/10" />
          
          <div className="flex gap-6">
            <button className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors pb-1">Abiertos</button>
            <button className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors pb-1">Pendientes</button>
            <button className="text-[10px] font-black uppercase tracking-widest text-[#10B981] border-b-2 border-[#10B981] pb-1">Resueltos</button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
            <input 
              type="text" 
              placeholder="Buscar en el histórico..." 
              className="bg-[#111] border-none rounded-full py-1.5 pl-9 pr-4 text-xs w-72 focus:ring-1 focus:ring-[#10B981] transition-all text-white placeholder-neutral-700"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </nav>

      {/* ÁREA DE TRABAJO */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col gap-4">
        
        <div className="flex justify-between items-end mb-2">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">Historial de Soluciones</h2>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Casos cerrados y satisfacción garantizada</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 bg-[#10B981]/5 border border-[#10B981]/20 px-4 py-1.5 rounded-full">
               <Trophy size={14} className="text-[#10B981]" />
               <span className="text-[#10B981] text-[10px] font-black uppercase tracking-widest">Resolución Promedio: 4.2h</span>
            </div>
          </div>
        </div>

        {/* LISTA DE ARCHIVO */}
        <div className="flex-1 bg-[#0a0a0a] border border-white/[0.03] rounded-[40px] overflow-hidden flex flex-col shadow-2xl">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.3em] text-neutral-600 font-black">
                  <th className="px-8 py-6">Estado</th>
                  <th className="px-8 py-6">Ticket / Marca</th>
                  <th className="px-8 py-6">Problema & Solución</th>
                  <th className="px-8 py-6">Tela</th>
                  <th className="px-8 py-6">Tiempo de Respuesta</th>
                  <th className="px-8 py-6 text-right">Agente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {resolvedTickets
                  .filter(t => t.company.toLowerCase().includes(searchTerm.toLowerCase()) || t.issue.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((ticket, idx) => {
                    const product = products.find(p => p.id === ticket.productId);
                    return (
                      <motion.tr 
                        key={ticket.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="hover:bg-emerald-500/[0.01] transition-colors group cursor-pointer"
                      >
                        <td className="px-8 py-6">
                          <div className="bg-emerald-500/10 border border-emerald-500/20 w-8 h-8 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                            <ShieldCheck size={16} className="text-[#10B981]" />
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors">{ticket.company}</span>
                            <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">#{ticket.id} • {ticket.date}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 max-w-sm">
                          <div className="flex flex-col gap-1">
                            <p className="text-xs text-neutral-500 line-clamp-1 italic">"{ticket.issue}"</p>
                            <p className="text-[11px] text-emerald-500 font-bold uppercase tracking-tight flex items-center gap-1">
                              <CheckCircle2 size={12} /> {ticket.resolution}
                            </p>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className="text-xs font-bold text-neutral-400 uppercase tracking-tighter border border-white/5 px-2 py-1 rounded bg-white/5">{product?.title}</span>
                        </td>
                        <td className="px-8 py-6 font-mono text-[10px] text-neutral-500">
                          {ticket.timeToResolve}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2 text-neutral-400">
                            <span className="text-[10px] font-bold uppercase">{ticket.agent}</span>
                            <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center border border-white/10">
                               <User size={10} className="text-neutral-500" />
                            </div>
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
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #065f46; }
        body { overflow: hidden; }
      `}} />
    </div>
  );
}