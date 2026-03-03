"use client"

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Plus, Clock, ChevronRight, 
  Package, User, MessageSquare, MoreVertical,
  Truck, Microscope
} from 'lucide-react';
import { products } from '@/lib/products'; 

// --- MOCK DATA: Solo Tickets Pendientes (Coyote Textil) ---
const pendingTickets = [
  { id: "TK-301", productId: "prod_oxford", company: "Moda Corporativa", issue: "Esperando autorización de muestra de color", reason: "Cliente", timeWaiting: "2d 4h", agent: "Ana S." },
  { id: "TK-302", productId: "prod_gabardina_stretch", company: "Uniformes Pro", issue: "Retraso en fletera (Paquetexpress)", reason: "Logística", timeWaiting: "1d 6h", agent: "Carlos M." },
  { id: "TK-303", productId: "prod_tergal", company: "Distribuidora Bajío", issue: "Revisión de metraje por faltante reportado", reason: "Almacén", timeWaiting: "5h 20m", agent: "Javier F." },
  { id: "TK-304", productId: "prod_popelina", company: "Blusas de México", issue: "Esperando respuesta sobre cambio de lote", reason: "Cliente", timeWaiting: "3d 1h", agent: "Ana S." },
  { id: "TK-305", productId: "prod_diablo", company: "Tácticos Elite", issue: "Prueba de resistencia en laboratorio externo", reason: "Calidad", timeWaiting: "4d 12h", agent: "Carlos M." },
];

export default function TicketsPendientesPage() {
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
            <button className="text-[10px] font-black uppercase tracking-widest text-[#FDCB02] border-b-2 border-[#FDCB02] pb-1">Pendientes</button>
            <button className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors pb-1">Resueltos</button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
            <input 
              type="text" 
              placeholder="Buscar seguimiento..." 
              className="bg-[#111] border-none rounded-full py-1.5 pl-9 pr-4 text-xs w-72 focus:ring-1 focus:ring-[#FDCB02] transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </nav>

      {/* ÁREA DE TRABAJO */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col gap-4">
        
        <div className="flex justify-between items-end mb-2">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">Tickets Pendientes</h2>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Gestión de esperas y seguimientos externos</p>
          </div>
          <div className="bg-[#FDCB02]/10 border border-[#FDCB02]/20 px-4 py-1.5 rounded-full">
            <span className="text-[#FDCB02] text-[10px] font-black uppercase tracking-widest">En Espera: {pendingTickets.length}</span>
          </div>
        </div>

        {/* LISTA DE SEGUIMIENTO */}
        <div className="flex-1 bg-[#0a0a0a] border border-white/[0.03] rounded-[40px] overflow-hidden flex flex-col shadow-2xl">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.3em] text-neutral-600 font-black">
                  <th className="px-8 py-6">Responsable de Espera</th>
                  <th className="px-8 py-6">Ticket / Marca</th>
                  <th className="px-8 py-6">Motivo de Pendiente</th>
                  <th className="px-8 py-6">Material</th>
                  <th className="px-8 py-6">Tiempo en Espera</th>
                  <th className="px-8 py-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {pendingTickets
                  .filter(t => t.company.toLowerCase().includes(searchTerm.toLowerCase()) || t.issue.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((ticket, idx) => {
                    const product = products.find(p => p.id === ticket.productId);
                    return (
                      <motion.tr 
                        key={ticket.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="hover:bg-white/[0.01] transition-colors group cursor-pointer"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            {ticket.reason === 'Cliente' && <User size={14} className="text-blue-400" />}
                            {ticket.reason === 'Logística' && <Truck size={14} className="text-orange-400" />}
                            {ticket.reason === 'Calidad' && <Microscope size={14} className="text-purple-400" />}
                            {ticket.reason === 'Almacén' && <Package size={14} className="text-[#FDCB02]" />}
                            <span className="text-[10px] font-bold uppercase tracking-tighter text-neutral-300">{ticket.reason}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-neutral-200 group-hover:text-[#FDCB02] transition-colors">{ticket.company}</span>
                            <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">#{ticket.id}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 max-w-xs">
                          <p className="text-xs text-neutral-400 italic line-clamp-1">"{ticket.issue}"</p>
                        </td>
                        <td className="px-8 py-6">
                           <span className="text-xs font-bold text-neutral-500 uppercase tracking-tighter italic">{product?.title || "Sin definir"}</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <Clock size={12} className="text-neutral-600" />
                            <span className="text-[10px] font-mono text-neutral-500">{ticket.timeWaiting}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="px-3 py-1.5 bg-[#FDCB02]/10 text-[#FDCB02] border border-[#FDCB02]/20 hover:bg-[#FDCB02] hover:text-black rounded-lg transition-all font-bold text-[9px] uppercase tracking-widest">
                              Empujar
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