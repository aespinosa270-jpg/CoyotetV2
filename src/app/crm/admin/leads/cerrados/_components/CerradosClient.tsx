"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ShieldCheck, CheckCircle2, Package } from "lucide-react";
import { TicketPriority } from "@prisma/client";

type Ticket = {
  id:          string;
  company:     string;
  issue:       string;
  resolution?: string | null;
  priority:    TicketPriority;
  createdAt:   string;
  updatedAt:   string; // ✅ era resolvedAt
  employee:    { id: string; name: string };
  product:     { id: string; title: string; sku: string } | null;
  user:        { id: string; name: string; email: string } | null;
};

// ✅ usa updatedAt como proxy de fecha de resolución
function resolveTime(created: string, updated: string) {
  const diff = new Date(updated).getTime() - new Date(created).getTime();
  const h    = Math.floor(diff / 3600000);
  if (h < 1)  return `${Math.floor(diff / 60000)}m`;
  if (h < 24) return `${h}h ${Math.floor((diff % 3600000) / 60000)}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export default function CerradosClient({ tickets }: { tickets: Ticket[] }) {
  const [search, setSearch] = useState("");

  const filtered = (tickets ?? []).filter(
    (t) =>
      t.company.toLowerCase().includes(search.toLowerCase()) ||
      t.issue.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en el histórico..."
            className="bg-zinc-900 border border-zinc-800 rounded-full py-1.5 pl-9 pr-4 text-xs w-72 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all"
          />
        </div>
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
          {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#0a0a0a] z-10">
            <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold">
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Ticket / Marca</th>
              <th className="px-6 py-4">Problema & Solución</th>
              <th className="px-6 py-4">Tela</th>
              <th className="px-6 py-4">Tiempo Respuesta</th>
              <th className="px-6 py-4 text-right">Agente</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[10px] text-zinc-700 uppercase tracking-widest">
                  Sin tickets resueltos
                </td>
              </tr>
            )}
            {filtered.map((ticket, idx) => (
              <motion.tr
                key={ticket.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                className="hover:bg-emerald-500/[0.01] transition-colors group"
              >
                {/* Ícono resuelto */}
                <td className="px-6 py-5">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 w-8 h-8 rounded-full flex items-center justify-center">
                    <ShieldCheck size={14} className="text-emerald-400" />
                  </div>
                </td>

                {/* ID + empresa */}
                <td className="px-6 py-5">
                  <p className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">
                    {ticket.company}
                  </p>
                  <p className="text-[10px] font-mono text-zinc-600 uppercase">
                    #{ticket.id.slice(-6)} ·{" "}
                    {new Date(ticket.updatedAt).toLocaleDateString("es-MX", {
                      day: "2-digit", month: "short",
                    })}
                  </p>
                </td>

                {/* Problema + resolución */}
                <td className="px-6 py-5 max-w-sm">
                  <p className="text-xs text-zinc-500 italic line-clamp-1">
                    "{ticket.issue}"
                  </p>
                  {ticket.resolution && (
                    <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={11} /> {ticket.resolution}
                    </p>
                  )}
                </td>

                {/* Tela */}
                <td className="px-6 py-5">
                  {ticket.product ? (
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-tighter border border-white/5 px-2 py-1 rounded bg-white/5">
                      {ticket.product.title}
                    </span>
                  ) : (
                    <span className="text-zinc-700 text-xs">—</span>
                  )}
                </td>

                {/* Tiempo de respuesta */}
                <td className="px-6 py-5 font-mono text-[10px] text-zinc-500">
                  {resolveTime(ticket.createdAt, ticket.updatedAt)}
                </td>

                {/* Agente */}
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[10px] font-bold uppercase text-zinc-400">
                      {ticket.employee.name}
                    </span>
                    <div className="w-6 h-6 rounded bg-[#FDCB02] text-black text-[8px] font-black flex items-center justify-center shrink-0">
                      {ticket.employee.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
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