"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Search, Clock, ArrowRight } from "lucide-react";
import { TicketPriority } from "@prisma/client";
import { updateTicketStatusAction, resolveTicketAction } from "@/app/actions/tickets";

type Ticket = {
  id: string; subject: string; description: string;
  priority: TicketPriority; createdAt: string; updatedAt: string;
  employee: { id: string; name: string } | null;
  user:     { id: string; name: string; email: string };
  order:    { id: string; orderNumber: string } | null;
};

function timeWaiting(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export default function PendientesClient({ tickets }: { tickets: Ticket[] }) {
  const [search, setSearch]  = useState("");
  const [, startTransition]  = useTransition();

  const filtered = (tickets ?? []).filter(
    (t) =>
      t.user.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase())
  );

  const handleReopen  = (id: string) => startTransition(async () => { await updateTicketStatusAction(id, "ABIERTO"); });
  const handleResolve = (id: string) => startTransition(async () => { await resolveTicketAction(id); });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden">
      <div className="flex items-center px-6 py-4 border-b border-white/5 shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar seguimiento..."
            className="bg-zinc-900 border border-zinc-800 rounded-full py-1.5 pl-9 pr-4 text-xs w-72 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/40 transition-all" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#0a0a0a] z-10">
            <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold">
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Asunto</th>
              <th className="px-6 py-4">Agente</th>
              <th className="px-6 py-4">Tiempo en Revisión</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-[10px] text-zinc-700 uppercase tracking-widest">Sin tickets en revisión</td></tr>
            )}
            {filtered.map((ticket, idx) => (
              <motion.tr key={ticket.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.04 }}
                className="hover:bg-white/[0.01] transition-colors group"
              >
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-zinc-200">{ticket.user.name}</p>
                  <p className="text-[10px] text-zinc-600">{ticket.user.email}</p>
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
                      <span className="text-[10px] text-zinc-400">{ticket.employee.name}</span>
                    </div>
                  ) : <span className="text-[10px] text-zinc-700">Sin asignar</span>}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <Clock size={11} className="text-amber-500/60" />
                    <span className="text-[10px] font-mono text-zinc-500">{timeWaiting(ticket.updatedAt)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleReopen(ticket.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500 rounded-lg transition-all font-bold text-[9px] uppercase tracking-widest">
                      Reabrir
                    </button>
                    <button onClick={() => handleResolve(ticket.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-800 hover:bg-emerald-500 hover:text-black rounded-lg transition-all font-bold text-[9px] uppercase tracking-widest">
                      Resolver <ArrowRight size={10} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}