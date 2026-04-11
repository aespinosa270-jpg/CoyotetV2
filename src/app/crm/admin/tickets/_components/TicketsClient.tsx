// src/app/crm/admin/tickets/_components/TicketsClient.tsx
"use client";

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, CheckCircle2, 
  MessageSquare, MoreVertical, User2, Clock, Tag
} from 'lucide-react';
import { updateTicketStatusAction } from '@/app/actions/tickets'; 
import { assignTicket } from '../actions'; // ✅ Importamos tu nueva acción
import Link from 'next/link';
import { TicketPriority, TicketStatus } from '@prisma/client';

type TabType = "abiertos" | "pendientes" | "cerrados";

interface TicketData {
  id: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  employee: { id: string; name: string } | null;
  user: { id: string; name: string; email: string; company: string | null } | null;
  order: { id: string; orderNumber: string } | null;
  _count?: { messages: number };
}

interface Props {
  initialData: Record<TabType, TicketData[]>;
  agentes: { id: string; name: string; role: string }[]; // ✅ Agregamos los agentes a los props
}

export default function TicketsClient({ initialData, agentes }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("abiertos");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();

  const [localData, setLocalData] = useState(initialData);

  const currentTickets = localData[activeTab];

  const filteredTickets = currentTickets.filter(t => {
    const term = searchTerm.toLowerCase();
    return (
      (t.user?.company?.toLowerCase().includes(term)) || 
      (t.subject.toLowerCase().includes(term)) ||
      (t.id.toLowerCase().includes(term))
    );
  });

  // Mover a resuelto
  const handleResolve = (ticketId: string) => {
    const ticketToMove = localData.abiertos.find(t => t.id === ticketId) || localData.pendientes.find(t => t.id === ticketId);
    if (!ticketToMove) return;

    setLocalData(prev => ({
      ...prev,
      abiertos: prev.abiertos.filter(t => t.id !== ticketId),
      pendientes: prev.pendientes.filter(t => t.id !== ticketId),
      cerrados: [{ ...ticketToMove, status: "RESUELTO" }, ...prev.cerrados]
    }));

    startTransition(async () => {
      const res = await updateTicketStatusAction(ticketId, "RESUELTO");
      if (!res.success) {
        alert("Error al resolver el ticket: " + res.error);
        window.location.reload(); 
      }
    });
  };

  // ✅ NUEVO: Función para Asignar Agente
  const handleAssign = (ticketId: string, employeeId: string) => {
    const ticketToMove = localData.abiertos.find(t => t.id === ticketId);
    if (!ticketToMove) return;

    const assignedAgent = agentes.find(a => a.id === employeeId);

    // Optimistic Update: Lo sacamos de abiertos y lo metemos a pendientes
    setLocalData(prev => ({
      ...prev,
      abiertos: prev.abiertos.filter(t => t.id !== ticketId),
      pendientes: [{ 
        ...ticketToMove, 
        status: "EN_REVISION", 
        employee: { id: employeeId, name: assignedAgent?.name || "" } 
      }, ...prev.pendientes]
    }));

    // Disparamos al backend
    startTransition(async () => {
      const res = await assignTicket(ticketId, employeeId);
      if (!res.success) {
        alert("Error al asignar: " + res.error);
        window.location.reload(); 
      }
    });
  };

  const getPriorityStyles = (p: TicketPriority) => {
    if (p === 'URGENTE') return 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30';
    if (p === 'ALTA') return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
    if (p === 'MEDIA') return 'bg-[#FDCB02]/10 text-[#FDCB02] border-[#FDCB02]/30';
    return 'bg-zinc-800 text-zinc-400 border-zinc-700';
  };

  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      
      {/* ─── NAVEGACIÓN Y TABS ─── */}
      <nav className="flex-none h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-black italic tracking-tighter text-[#FDCB02]">COYOTE <span className="text-white">CRM</span></h1>
          <div className="h-4 w-px bg-white/10" />
          
          <div className="flex gap-6">
            <button 
              onClick={() => setActiveTab("abiertos")}
              className={`text-[10px] font-black uppercase tracking-widest pb-1 transition-all ${
                activeTab === "abiertos" ? "text-[#EF4444] border-b-2 border-[#EF4444]" : "text-neutral-500 hover:text-white"
              }`}
            >
              Abiertos ({localData.abiertos.length})
            </button>
            <button 
              onClick={() => setActiveTab("pendientes")}
              className={`text-[10px] font-black uppercase tracking-widest pb-1 transition-all ${
                activeTab === "pendientes" ? "text-sky-400 border-b-2 border-sky-400" : "text-neutral-500 hover:text-white"
              }`}
            >
              En Revisión ({localData.pendientes.length})
            </button>
            <button 
              onClick={() => setActiveTab("cerrados")}
              className={`text-[10px] font-black uppercase tracking-widest pb-1 transition-all ${
                activeTab === "cerrados" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-neutral-500 hover:text-white"
              }`}
            >
              Resueltos ({localData.cerrados.length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
            <input 
              type="text" 
              placeholder="Buscar por cliente o ID..." 
              className="bg-[#111] border-none rounded-full py-1.5 pl-9 pr-4 text-xs w-72 focus:ring-1 focus:ring-[#EF4444] transition-all text-white placeholder:text-neutral-600 outline-none"
              onChange={(e) => setSearchTerm(e.target.value)}
              value={searchTerm}
            />
          </div>
          <button className="bg-[#EF4444] text-white px-5 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2">
            <Plus size={14} /> Nueva Incidencia
          </button>
        </div>
      </nav>

      {/* ─── ÁREA DE TRABAJO ─── */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col gap-4">
        <div className="flex justify-between items-end mb-2 shrink-0">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">
              Tickets {activeTab === "abiertos" ? "Pendientes" : activeTab === "pendientes" ? "En Investigación" : "Históricos"}
            </h2>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">
              {activeTab === "abiertos" ? "Resolución inmediata de incidencias" : "Buzón de seguimiento"}
            </p>
          </div>
          <div className="flex gap-2">
             {activeTab === "abiertos" && (
               <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 px-3 py-1 rounded-lg text-[#EF4444] text-[10px] font-bold uppercase tracking-tighter">
                 {localData.abiertos.filter(t => t.priority === "URGENTE").length} Urgencias
               </div>
             )}
             <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-neutral-400 text-[10px] font-bold uppercase tracking-tighter">
               Mostrando: {filteredTickets.length}
             </div>
          </div>
        </div>

        {/* ─── LISTA OPERATIVA (TABLA) ─── */}
        <div className="flex-1 bg-[#0a0a0a] border border-white/[0.03] rounded-[40px] overflow-hidden flex flex-col shadow-2xl">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.3em] text-neutral-600 font-black">
                  <th className="px-8 py-6">Prioridad</th>
                  <th className="px-8 py-6">Ticket / Cliente</th>
                  <th className="px-8 py-6 max-w-sm">Descripción del Problema</th>
                  <th className="px-8 py-6">Detalles Técnicos</th>
                  <th className="px-8 py-6">Última Actividad</th>
                  <th className="px-8 py-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-zinc-600 space-y-3">
                        <CheckCircle2 size={40} className="opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Bandeja Limpia</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {filteredTickets.map((ticket, idx) => (
                      <motion.tr 
                        key={ticket.id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.03 }}
                        className="hover:bg-white/[0.01] transition-colors group cursor-default"
                      >
                        {/* 1. Prioridad */}
                        <td className="px-8 py-6">
                          <span className={`text-[8px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter border ${getPriorityStyles(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                        </td>

                        {/* 2. Cliente e ID */}
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-neutral-200 group-hover:text-white transition-colors">
                              {ticket.user?.company || ticket.user?.name || "Cliente Desconocido"}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                              #{ticket.id.slice(0, 8)}
                              {ticket._count && ticket._count.messages > 0 && (
                                <span className="ml-2 text-sky-400 bg-sky-400/10 px-1.5 rounded">{ticket._count.messages} msgs</span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* 3. Descripción */}
                        <td className="px-8 py-6 max-w-sm">
                          <p className="text-xs font-bold text-white mb-0.5 truncate">{ticket.subject}</p>
                          <p className="text-[10px] text-neutral-500 group-hover:text-neutral-300 transition-colors italic line-clamp-1">
                            {ticket.description}
                          </p>
                        </td>

                        {/* 4. Detalles Técnicos (AQUÍ VA LA ASIGNACIÓN) */}
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-2">
                            {ticket.order ? (
                              <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono bg-white/5 w-fit px-2 py-0.5 rounded border border-white/5">
                                <Tag size={10} className="text-[#FDCB02]" /> OP-{ticket.order.orderNumber}
                              </div>
                            ) : (
                              <span className="text-[10px] text-neutral-600 italic">Sin OP Vinculada</span>
                            )}
                            
                            {/* Selector integrado */}
                            <div className="flex items-center gap-2 text-[10px] text-neutral-500 uppercase font-black mt-1">
                              <User2 size={12} className={ticket.employee ? "text-emerald-400" : "text-neutral-600"} />
                              
                              {activeTab === "abiertos" && !ticket.employee ? (
                                <select 
                                  className="bg-transparent border-b border-dashed border-neutral-600 text-white focus:outline-none focus:border-[#FDCB02] cursor-pointer appearance-none w-32"
                                  onChange={(e) => handleAssign(ticket.id, e.target.value)}
                                  defaultValue=""
                                  disabled={isPending}
                                >
                                  <option value="" disabled className="bg-[#111]">Asignar Agente...</option>
                                  {agentes.map(a => (
                                    <option key={a.id} value={a.id} className="bg-[#111] text-white">
                                      {a.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className={ticket.employee ? "text-emerald-400" : ""}>
                                  {ticket.employee?.name || "Sin Asignar"}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 5. Tiempos */}
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <Clock size={12} className={ticket.priority === 'URGENTE' && activeTab === 'abiertos' ? 'text-[#EF4444]' : 'text-neutral-600'} />
                            <span className={`text-[10px] font-mono ${ticket.priority === 'URGENTE' && activeTab === 'abiertos' ? 'text-[#EF4444] font-bold' : 'text-neutral-500'}`}>
                              {new Date(activeTab === "cerrados" ? ticket.updatedAt : ticket.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </td>

                        {/* 6. Acciones */}
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link 
                              href={`/crm/admin/tickets/${ticket.id}`}
                              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-all flex items-center gap-1.5"
                            >
                              <MessageSquare size={14} />
                            </Link>

                            {activeTab !== "cerrados" && (
                              <button 
                                onClick={() => handleResolve(ticket.id)}
                                disabled={isPending}
                                className="p-2 bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981] hover:text-black rounded-lg transition-all font-bold text-[10px] uppercase disabled:opacity-50"
                              >
                                Resolver
                              </button>
                            )}
                            
                            <button className="text-neutral-600 hover:text-white p-2">
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
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
      `}} />
    </div>
  );
}