"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ShieldCheck } from "lucide-react";
import { TicketPriority, TicketStatus } from "@prisma/client";

type Ticket = {
  id: string; subject: string; description: string;
  priority: TicketPriority; status: TicketStatus;
  createdAt: string; updatedAt: string;
  employee: { id: string; name: string } | null;
  user:     { id: string; name: string; email: string };
  order:    { id: string; orderNumber: string } | null;
};

const STATUS_CLS: Partial<Record<TicketStatus, string>> = {
  RESUELTO: "text-emerald-400 border-emerald-800 bg-emerald-900/20",
  CERRADO:  "text-zinc-400    border-zinc-700    bg-zinc-800/40",
};

function resolveTime(created: string, updated: string) {
  const h = Math.floor((new Date(updated).getTime() - new Date(created).getTime()) / 3600000);
  if (h < 1)  return `${Math.floor((new Date(updated).getTime() - new Date(created).getTime()) / 60000)}m`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export default function CerradosClient({ tickets }: { tickets: Ticket[] }) {
  const [search, setSearch] = useState("");

  const filtered = (tickets ?? []).filter(
    (t) =>
      t.user.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en el histórico..."
            className="bg-zinc-900 border border-zinc-800 rounded-full py-1.5 pl-9 pr-4 text-xs w-72 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all" />
        </div>
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
          {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#0a0a0a] z-10">
            <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold">
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Ticket / Cliente</th>
              <th className="px-6 py-4">Asunto</th>
              <th className="px-6 py-4">Agente</th>
              <th className="px-6 py-4">Tiempo Respuesta</th>
              <th className="px-6 py-4">Fecha Cierre</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-[10px] text-zinc-700 uppercase tracking-widest">Sin tickets cerrados</td></tr>
            )}
            {filtered.map((ticket, idx) => (
              <motion.tr key={ticket.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                className="hover:bg-emerald-500/[0.01] transition-colors"
              >
                <td className="px-6 py-5">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 w-8 h-8 rounded-full flex items-center justify-center">
                    <ShieldCheck size={14} className="text-emerald-400" />
                  </div>
                </td>
                <td className="px-6 py-5">
                  <p className="text-sm font-bold text-zinc-300">{ticket.user.name}</p>
                  <p className="text-[10px] font-mono text-zinc-600">
                    #{ticket.id.slice(-6)}
                  </p>
                </td>
                <td className="px-6 py-5 max-w-xs">
                  <p className="text-xs font-bold text-zinc-400 truncate">{ticket.subject}</p>
                  <p className="text-[10px] text-zinc-600 italic line-clamp-1 mt-0.5">{ticket.description}</p>
                </td>
                <td className="px-6 py-5">
                  {ticket.employee ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded bg-[#FDCB02] text-black text-[8px] font-black flex items-center justify-center shrink-0">
                        {ticket.employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[10px] text-zinc-400">{ticket.employee.name}</span>
                    </div>
                  ) : <span className="text-zinc-700 text-xs">—</span>}
                </td>
                <td className="px-6 py-5 font-mono text-[10px] text-zinc-500">
                  {resolveTime(ticket.createdAt, ticket.updatedAt)}
                </td>
                <td className="px-6 py-5 text-[10px] font-mono text-zinc-600">
                  {new Date(ticket.updatedAt).toLocaleDateString("es-MX", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}