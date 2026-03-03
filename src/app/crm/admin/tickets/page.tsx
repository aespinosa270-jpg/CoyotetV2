"use client"

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Plus, AlertCircle, Clock, 
  ChevronRight, Filter, Package, User,
  MessageSquare, MoreVertical, ArrowUpRight
} from 'lucide-react';
import { products } from '@/lib/products'; 

// --- MOCK DATA: Solo Tickets Abiertos (Coyote Textil) ---
const openTickets = [
  { id: "TK-201", productId: "prod_diablo", company: "Uniformes Pro", issue: "Rollos con mancha de aceite en lote 44", priority: "Crítica", timeOpen: "1h 12m", agent: "Carlos M." },
  { id: "TK-202", productId: "prod_sportok_escolar", company: "Textiles Bajío", issue: "Diferencia de tonalidad vs muestra física", priority: "Alta", timeOpen: "3h 45m", agent: "Ana S." },
  { id: "TK-207", productId: "prod_apolo", company: "Sportswear MX", issue: "Faltan 3 rollos en el último flete", priority: "Crítica", timeOpen: "5h 20m", agent: "Javier F." },
  { id: "TK-208", productId: "prod_alaska", company: "EcoStyle Brand", issue: "Solicitud de ficha técnica de exportación", priority: "Media", timeOpen: "8h 10m", agent: "Ana S." },
  { id: "TK-209", productId: "prod_felpa_china", company: "Winter Gear", issue: "Retraso en aduana de rollos de prueba", priority: "Alta", timeOpen: "1d 2h", agent: "Carlos M." },
];

export default function TicketsAbiertosPage() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      
      {/* NAVEGACIÓN DE SUBDIVISIONES (Arriba, sin estorbar) */}
      <nav className="flex-none h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-black italic tracking-tighter text-[#FDCB02]">COYOTE <span className="text-white">CRM</span></h1>
          <div className="h-4 w-px bg-white/10" />
          
          {/* Tabs de Subdivisión */}
          <div className="flex gap-6">
            <button className="text-[10px] font-black uppercase tracking-widest text-[#EF4444] border-b-2 border-[#EF4444] pb-1">Abiertos</button>
            <button className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors pb-1">Pendientes</button>
            <button className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors pb-1">Resueltos</button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
            <input 
              type="text" 
              placeholder="Buscar por cliente o problema..." 
              className="bg-[#111] border-none rounded-full py-1.5 pl-9 pr-4 text-xs w-72 focus:ring-1 focus:ring-[#EF4444] transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="bg-[#EF4444] text-white px-5 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2">
            <Plus size={14} /> Nueva Incidencia
          </button>
        </div>
      </nav>

      {/* ÁREA DE TRABAJO */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col gap-4">
        
        {/* Header de la Sección */}
        <div className="flex justify-between items-end mb-2">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">Tickets Abiertos</h2>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Resolución inmediata de incidencias textiles</p>
          </div>
          <div className="flex gap-2">
             <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 px-3 py-1 rounded-lg text-[#EF4444] text-[10px] font-bold uppercase tracking-tighter">
               2 Críticos
             </div>
             <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-neutral-400 text-[10px] font-bold uppercase tracking-tighter">
               Total: {openTickets.length}
             </div>
          </div>
        </div>

        {/* LISTA OPERATIVA */}
        <div className="flex-1 bg-[#0a0a0a] border border-white/[0.03] rounded-[40px] overflow-hidden flex flex-col shadow-2xl">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.3em] text-neutral-600 font-black">
                  <th className="px-8 py-6">Prioridad</th>
                  <th className="px-8 py-6">Ticket / Cliente</th>
                  <th className="px-8 py-6">Descripción del Problema</th>
                  <th className="px-8 py-6">Tela Afectada</th>
                  <th className="px-8 py-6">Tiempo Abierto</th>
                  <th className="px-8 py-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {openTickets
                  .filter(t => t.company.toLowerCase().includes(searchTerm.toLowerCase()) || t.issue.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((ticket, idx) => {
                    const product = products.find(p => p.id === ticket.productId);
                    return (
                      <motion.tr 
                        key={ticket.id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="hover:bg-white/[0.01] transition-colors group cursor-pointer"
                      >
                        <td className="px-8 py-6">
                          <span className={`text-[8px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter border ${
                            ticket.priority === 'Crítica' ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30' : 
                            ticket.priority === 'Alta' ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' : 
                            'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                          }`}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-neutral-200 group-hover:text-white transition-colors">{ticket.company}</span>
                            <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">#{ticket.id}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 max-w-xs">
                          <p className="text-xs text-neutral-400 group-hover:text-neutral-200 transition-colors italic line-clamp-2">
                            "{ticket.issue}"
                          </p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center">
                              <Package size={14} className="text-[#FDCB02]" />
                            </div>
                            <span className="text-xs font-bold text-neutral-400">{product?.title}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <Clock size={12} className={ticket.priority === 'Crítica' ? 'text-[#EF4444]' : 'text-neutral-600'} />
                            <span className={`text-[10px] font-mono ${ticket.priority === 'Crítica' ? 'text-[#EF4444] font-bold' : 'text-neutral-500'}`}>
                              {ticket.timeOpen}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-all">
                              <MessageSquare size={14} />
                            </button>
                            <button className="p-2 bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981] hover:text-black rounded-lg transition-all font-bold text-[10px] uppercase">
                              Resolver
                            </button>
                            <button className="text-neutral-600 hover:text-white">
                              <MoreVertical size={16} />
                            </button>
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
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #333; }
        body { overflow: hidden; }
      `}} />
    </div>
  );
}