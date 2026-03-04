"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Clock, CheckCircle2, User } from "lucide-react";
import { TicketPriority } from "@prisma/client";
import { resolveTicketAction, updateTicketStatusAction } from "@/app/actions/tickets";

type Ticket = {
  id: string; subject: string; description: string;
  priority: TicketPriority; createdAt: string; updatedAt: string;
  employee: { id: string; name: string } | null;
  user:     { id: string; name: string; email: string };
  order:    { id: string; orderNumber: string } | null;
};

const PRIORITY_CFG: Record<TicketPriority, { label: string; cls: string; clockCls: string }> = {
  URGENTE: { label: "Urgente", cls: "bg-red-500/10 text-red-400 border-red-500/30",        clockCls: "text-red-400"    },
  ALTA:    { label: "Alta",    cls: "bg-orange-500/10 text-orange-400 border-orange-500/30",clockCls: "text-orange-400" },
  MEDIA:   { label: "Media",   cls: "bg-amber-500/10 text-amber-400 border-amber-500/30",  clockCls: "text-zinc-500"   },
  BAJA:    { label: "Baja",    cls: "bg-zinc-800 text-zinc-500 border-zinc-700",            clockCls: "text-zinc-600"   },
};

function timeOpen(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export default function AbiertosClient({ tickets }: { tickets: Ticket[] }) {
  const [search,  setSearch]  = useState("");
  const [, startTransition]   = useTransition();

  const filtered = (tickets ?? []).filter(
    (t) =>
      t.user.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase())    ||
      t.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleResolve  = (id: string) => startTransition(() => resolveTicketAction(id));
  const handleRevision = (id: string) => startTransition(() => updateTicketStatusAction(id, "EN_REVISION"));

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente o asunto..."
            className="bg-zinc-900 border border-zinc-800 rounded-full py-1.5 pl-9 pr-4 text-xs w-72 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-red-500/40 transition-all" />
        </div>
        <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all">
          <Plus size={13} /> Nueva Incidencia
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#0a0a0a] z-10">
            <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold">
              <th className="px-6 py-4">Prioridad</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Asunto & Descripción</th>
              <th className="px-6 py-4">Agente</th>
              <th className="px-6 py-4">Tiempo Abierto</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-[10px] text-zinc-700 uppercase tracking-widest">Sin tickets abiertos</td></tr>
            )}
            {filtered.map((ticket, idx) => {
              const p = PRIORITY_CFG[ticket.priority];
              return (
                <motion.tr key={ticket.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="hover:bg-white/[0.01] transition-colors group"
                >
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-tight border ${p.cls}`}>
                      {p.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-zinc-200">{ticket.user.name}</p>
                    <p className="text-[10px] text-zinc-600 truncate max-w-[140px]">{ticket.user.email}</p>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-xs font-bold text-zinc-300 truncate">{ticket.subject}</p>
                    <p className="text-[10px] text-zinc-500 italic line-clamp-1 mt-0.5">{ticket.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    {ticket.employee ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-[#FDCB02] text-black text-[8px] font-black flex items-center justify-center shrink-0">
                          {ticket.employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[10px] text-zinc-400 truncate max-w-[80px]">{ticket.employee.name}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-700">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <Clock size={11} className={p.clockCls} />
                      <span className={`text-[10px] font-mono ${p.clockCls}`}>{timeOpen(ticket.createdAt)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleRevision(ticket.id)}
                        className="px-2.5 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-800 hover:bg-amber-500/20 rounded-lg transition-all font-bold text-[9px] uppercase tracking-widest">
                        Revisar
                      </button>
                      <button onClick={() => handleResolve(ticket.id)}
                        className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-800 hover:bg-emerald-500 hover:text-black rounded-lg transition-all font-bold text-[9px] uppercase tracking-widest">
                        Resolver
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
  );
}