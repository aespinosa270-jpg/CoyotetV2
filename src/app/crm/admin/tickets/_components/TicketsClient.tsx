// src/app/crm/admin/tickets/_components/TicketsClient.tsx
"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Clock } from 'lucide-react';
import { assignTicket, resolveTicketAdmin } from '../actions'; 
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
  agentes: { id: string; name: string; role: string }[]; 
}

function getTimeAgo(date: string | Date) {
  const h = Math.floor((Date.now() - new Date(date).getTime()) / 3600000);
  if (h < 1) return `${Math.floor((Date.now() - new Date(date).getTime()) / 60000)}m`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function TicketsClient({ initialData, agentes }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("abiertos");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false); 
  const [localData, setLocalData] = useState(initialData);

  const currentTickets = localData[activeTab];
  const filteredTickets = currentTickets.filter(t => {
    const term = searchTerm.toLowerCase();
    return (
      (t.user?.company?.toLowerCase().includes(term)) || 
      (t.user?.name?.toLowerCase().includes(term)) || 
      (t.subject.toLowerCase().includes(term)) ||
      (t.id.toLowerCase().includes(term))
    );
  });

  // ✅ FUNCIÓN RESOLVER
  const handleResolve = async (ticketId: string) => {
    if (isLoading) return;
    
    const ticketToMove = localData.abiertos.find(t => t.id === ticketId) || localData.pendientes.find(t => t.id === ticketId);
    if (!ticketToMove) return;

    setIsLoading(true);

    // Mover visualmente al instante
    setLocalData(prev => ({
      ...prev,
      abiertos: prev.abiertos.filter(t => t.id !== ticketId),
      pendientes: prev.pendientes.filter(t => t.id !== ticketId),
      cerrados: [{ ...ticketToMove, status: "RESUELTO" as TicketStatus }, ...prev.cerrados]
    }));

    try {
      const res = await resolveTicketAdmin(ticketId);
      if (!res?.success) {
        alert("Error al resolver: " + res?.error);
        window.location.reload(); 
      }
    } catch (e) {
      alert("Error de conexión con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FUNCIÓN ASIGNAR
  const handleAssign = async (ticketId: string, employeeId: string) => {
    if (isLoading || !employeeId) return;

    const ticketToMove = localData.abiertos.find(t => t.id === ticketId);
    if (!ticketToMove) return;

    setIsLoading(true);
    const assignedAgent = agentes.find(a => a.id === employeeId);

    // Mover visualmente al instante
    setLocalData(prev => ({
      ...prev,
      abiertos: prev.abiertos.filter(t => t.id !== ticketId),
      pendientes: [{ 
        ...ticketToMove, 
        status: "EN_REVISION" as TicketStatus, 
        employee: { id: employeeId, name: assignedAgent?.name || "" } 
      }, ...prev.pendientes]
    }));

    try {
      const res = await assignTicket(ticketId, employeeId);
      if (!res?.success) {
        alert("Error al asignar: " + res?.error);
        window.location.reload(); 
      }
    } catch (e) {
      alert("Error de conexión con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityStyles = (p: TicketPriority) => {
    if (p === 'URGENTE') return 'border border-red-500/50 text-red-500 bg-red-500/10';
    if (p === 'ALTA') return 'border border-orange-500/50 text-orange-500 bg-orange-500/10';
    if (p === 'MEDIA') return 'border border-[#FDCB02]/50 text-[#FDCB02] bg-[#FDCB02]/10';
    return 'border border-zinc-700 text-zinc-400 bg-zinc-800/50';
  };

  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      
      {/* ─── NAVEGACIÓN Y TABS ─── */}
      <nav className="flex-none h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#0a0a0a]">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-black italic tracking-tighter text-[#FDCB02]">COYOTE <span className="text-white">CRM</span></h1>
          <div className="h-4 w-px bg-white/10" />
          
          <div className="flex gap-6">
            <button 
              onClick={() => setActiveTab("abiertos")}
              className={`text-[10px] font-black uppercase tracking-widest pb-1 transition-all ${
                activeTab === "abiertos" ? "text-red-500 border-b-2 border-red-500" : "text-neutral-500 hover:text-white"
              }`}
            >
              Abiertos <span className="bg-white/10 px-1.5 py-0.5 rounded ml-1">{localData.abiertos.length}</span>
            </button>
            <button 
              onClick={() => setActiveTab("pendientes")}
              className={`text-[10px] font-black uppercase tracking-widest pb-1 transition-all ${
                activeTab === "pendientes" ? "text-amber-500 border-b-2 border-amber-500" : "text-neutral-500 hover:text-white"
              }`}
            >
              En Revisión <span className="bg-white/10 px-1.5 py-0.5 rounded ml-1">{localData.pendientes.length}</span>
            </button>
            <button 
              onClick={() => setActiveTab("cerrados")}
              className={`text-[10px] font-black uppercase tracking-widest pb-1 transition-all ${
                activeTab === "cerrados" ? "text-emerald-500 border-b-2 border-emerald-500" : "text-neutral-500 hover:text-white"
              }`}
            >
              Resueltos <span className="bg-white/10 px-1.5 py-0.5 rounded ml-1">{localData.cerrados.length}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
            <input 
              type="text" 
              placeholder="Buscar cliente, asunto o empresa..." 
              className="bg-[#111] border border-white/5 rounded-full py-1.5 pl-9 pr-4 text-xs w-72 focus:border-red-500 transition-all text-white placeholder:text-neutral-600 outline-none"
              onChange={(e) => setSearchTerm(e.target.value)}
              value={searchTerm}
            />
          </div>
          <button className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2">
            <Plus size={14} /> Nueva Incidencia
          </button>
        </div>
      </nav>

      {/* ─── ÁREA DE TRABAJO ─── */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col gap-4">
        
        {/* ─── LISTA OPERATIVA (TABLA) ─── */}
        <div className="flex-1 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/5">
                <tr className="text-[9px] uppercase tracking-[0.3em] text-neutral-600 font-black">
                  <th className="px-8 py-5">Prioridad</th>
                  <th className="px-8 py-5">Cliente</th>
                  <th className="px-8 py-5">Asunto & Descripción</th>
                  <th className="px-8 py-5">Agente</th>
                  <th className="px-8 py-5">Tiempo</th>
                  <th className="px-8 py-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-32 text-center">
                      <p className="text-xs font-black uppercase tracking-widest text-zinc-700">Sin tickets que mostrar</p>
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {filteredTickets.map((ticket, idx) => (
                      <motion.tr 
                        key={ticket.id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.03 }}
                        className="hover:bg-white/[0.01] transition-colors group"
                      >
                        {/* 1. Prioridad */}
                        <td className="px-8 py-5">
                          <span className={`text-[9px] font-black px-4 py-1.5 rounded uppercase tracking-widest ${getPriorityStyles(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                        </td>

                        {/* 2. Cliente */}
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">
                              {ticket.user?.name || "Cliente Desconocido"}
                            </span>
                            <span className="text-[11px] text-zinc-500 mt-0.5">
                              {ticket.user?.email || "Sin correo registrado"}
                            </span>
                          </div>
                        </td>

                        {/* 3. Asunto & Descripción */}
                        <td className="px-8 py-5 max-w-[300px]">
                          <p className="text-sm font-bold text-white truncate">{ticket.subject}</p>
                          <p className="text-[11px] text-zinc-500 italic truncate mt-0.5">
                            {ticket.description}
                          </p>
                        </td>

                        {/* 4. Agente (SELECT OBVIO Y VISIBLE) */}
                        <td className="px-8 py-5">
                          {ticket.employee ? (
                            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">
                              {ticket.employee.name}
                            </span>
                          ) : (
                            <select 
                              className="w-36 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded px-2 py-1.5 text-[10px] font-bold uppercase outline-none cursor-pointer focus:border-[#FDCB02] transition-colors"
                              onChange={(e) => handleAssign(ticket.id, e.target.value)}
                              defaultValue=""
                              disabled={isLoading}
                            >
                              <option value="" disabled>ASIGNAR A... ▼</option>
                              {agentes.map(a => (
                                <option key={a.id} value={a.id} className="bg-[#111] text-white normal-case">
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>

                        {/* 5. Tiempo */}
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-1.5 text-orange-400">
                            <Clock size={12} />
                            <span className="text-[11px] font-mono font-bold">
                              {getTimeAgo(activeTab === "cerrados" ? ticket.updatedAt : ticket.createdAt)}
                            </span>
                          </div>
                        </td>

                        {/* 6. Acciones */}
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Link 
                              href="/crm/admin/interacciones" 
                              className="border border-orange-500/50 text-orange-500 bg-orange-500/10 px-4 py-2 rounded text-[9px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-colors"
                            >
                              Revisar
                            </Link>

                            {activeTab !== "cerrados" && (
                              <button 
                                type="button"
                                onClick={() => handleResolve(ticket.id)}
                                disabled={isLoading}
                                className="border border-emerald-500/50 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isLoading ? "..." : "Resolver"}
                              </button>
                            )}
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
    </div>
  );
}