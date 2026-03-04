"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Clock, ShieldCheck, AlertTriangle } from "lucide-react";
import { TicketPriority, TicketStatus } from "@prisma/client";

type Ticket = {
  id:           string;
  ticketNumber: string;
  subject:      string;
  description:  string;
  priority:     TicketPriority;
  status:       TicketStatus;
  createdAt:    string;
  updatedAt:    string;
  user:         { id: string; name: string; email: string };
  order:        { id: string; orderNumber: string } | null;
};

const PRIORITY_CFG: Record<TicketPriority, { label: string; cls: string }> = {
  URGENTE: { label: "Urgente", cls: "bg-red-500/10 text-red-400 border-red-500/30"         },
  ALTA:    { label: "Alta",    cls: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
  MEDIA:   { label: "Media",   cls: "bg-amber-500/10 text-amber-400 border-amber-500/30"   },
  BAJA:    { label: "Baja",    cls: "bg-zinc-800 text-zinc-500 border-zinc-700"             },
};

const STATUS_CFG: Record<TicketStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  ABIERTO:     { label: "Abierto",     cls: "text-red-400",     icon: <AlertTriangle size={11} /> },
  EN_REVISION: { label: "En Revisión", cls: "text-amber-400",   icon: <Clock         size={11} /> },
  RESUELTO:    { label: "Resuelto",    cls: "text-emerald-400", icon: <ShieldCheck   size={11} /> },
  CERRADO:     { label: "Cerrado",     cls: "text-zinc-500",    icon: <ShieldCheck   size={11} /> },
};

const ALL_STATUSES = Object.keys(STATUS_CFG) as TicketStatus[];

function timeOpen(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1)  return `${Math.floor((Date.now() - new Date(iso).getTime()) / 60000)}m`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export default function MisTicketsClient({ tickets }: { tickets: Ticket[] }) {
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState<TicketStatus | "TODOS">("TODOS");

  const filtered = tickets.filter((t) => {
    const matchSearch =
      t.subject.toLowerCase().includes(search.toLowerCase())      ||
      t.description.toLowerCase().includes(search.toLowerCase())  ||
      t.user.name.toLowerCase().includes(search.toLowerCase())    ||
      t.ticketNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "TODOS" || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.04] shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ticket, cliente o número..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-1.5 pl-9 pr-4 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-red-500/40 transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => setFilterStatus("TODOS")}
            className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
              filterStatus === "TODOS"
                ? "bg-[#FDCB02] text-black border-[#FDCB02]"
                : "text-zinc-600 border-zinc-800 hover:text-zinc-400"
            }`}
          >
            Todos <span className="ml-1 opacity-60">{tickets.length}</span>
          </button>
          {ALL_STATUSES.map((s) => {
            const cnt = tickets.filter((t) => t.status === s).length;
            if (cnt === 0) return null;
            const cfg = STATUS_CFG[s];
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                  filterStatus === s
                    ? "bg-white/10 text-white border-white/20"
                    : "text-zinc-600 border-zinc-800 hover:text-zinc-400"
                }`}
              >
                <span className={cfg.cls}>{cfg.icon}</span>
                {cfg.label}
                <span className="opacity-60">{cnt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[10px] text-zinc-700 uppercase tracking-widest">Sin tickets</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#0a0a0a] z-10">
              <tr className="border-b border-white/[0.04] text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold">
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Ticket</th>
                <th className="px-6 py-4">Asunto</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Prioridad</th>
                <th className="px-6 py-4 text-right">Tiempo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {filtered.map((ticket, idx) => {
                const p   = PRIORITY_CFG[ticket.priority];
                const s   = STATUS_CFG[ticket.status];
                const open = ticket.status === "ABIERTO" || ticket.status === "EN_REVISION";
                return (
                  <motion.tr key={ticket.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-white/[0.01] transition-colors group"
                  >
                    {/* Estado */}
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-1.5 text-[10px] font-bold ${s.cls}`}>
                        {s.icon} {s.label}
                      </div>
                    </td>

                    {/* Número */}
                    <td className="px-6 py-4">
                      <p className="text-[10px] font-mono text-zinc-500 uppercase">{ticket.ticketNumber}</p>
                      <p className="text-[9px] text-zinc-700 font-mono mt-0.5">
                        {new Date(ticket.createdAt).toLocaleDateString("es-MX", {
                          day: "2-digit", month: "short",
                        })}
                      </p>
                    </td>

                    {/* Asunto */}
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors truncate">
                        {ticket.subject}
                      </p>
                      <p className="text-[10px] text-zinc-600 italic line-clamp-1 mt-0.5">
                        {ticket.description}
                      </p>
                    </td>

                    {/* Cliente */}
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-zinc-400">{ticket.user.name}</p>
                      <p className="text-[9px] text-zinc-600 truncate max-w-[120px]">{ticket.user.email}</p>
                    </td>

                    {/* Prioridad */}
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight border ${p.cls}`}>
                        {p.label}
                      </span>
                    </td>

                    {/* Tiempo */}
                    <td className="px-6 py-4 text-right">
                      <div className={`flex items-center justify-end gap-1 font-mono text-[10px] ${
                        open ? "text-zinc-400" : "text-zinc-700"
                      }`}>
                        {open && <Clock size={10} />}
                        {open
                          ? timeOpen(ticket.createdAt)
                          : new Date(ticket.updatedAt).toLocaleDateString("es-MX", {
                              day: "2-digit", month: "short",
                            })
                        }
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
