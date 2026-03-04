"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, TrendingUp, TrendingDown, Clock, Filter } from "lucide-react";
import { PipelineStatus } from "@prisma/client";

type Deal = {
  id:        string;
  title:     string;
  company:   string;
  value:     number;
  quantity:  number | null;
  status:    PipelineStatus;
  color:     string | null;
  notes:     string | null;
  createdAt: string;
  updatedAt: string;
  product:   { id: string; title: string; sku: string } | null;
  user:      { id: string; name: string; email: string } | null;
};

const STATUS_CFG: Record<PipelineStatus, { label: string; cls: string; dot: string }> = {
  PROSPECTO:       { label: "Prospecto",    cls: "bg-zinc-800 text-zinc-400 border-zinc-700",           dot: "bg-zinc-500"    },
  COTIZANDO:       { label: "Cotizando",    cls: "bg-sky-500/10 text-sky-400 border-sky-800",           dot: "bg-sky-400"     },
  NEGOCIACION:     { label: "Negociación",  cls: "bg-amber-500/10 text-amber-400 border-amber-800",     dot: "bg-amber-400"   },
  CERRADO_GANADO:  { label: "Ganado",       cls: "bg-emerald-500/10 text-emerald-400 border-emerald-800", dot: "bg-emerald-400" },
  CERRADO_PERDIDO: { label: "Perdido",      cls: "bg-red-500/10 text-red-400 border-red-800",           dot: "bg-red-400"     },
};

const ALL_STATUSES = Object.keys(STATUS_CFG) as PipelineStatus[];

const fmt = (v: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(v);

function timeAgo(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 24) return `${h}h`;
  if (h < 168) return `${Math.floor(h / 24)}d`;
  return `${Math.floor(h / 168)}sem`;
}

export default function PipelineClient({ deals }: { deals: Deal[] }) {
  const [search,     setSearch]     = useState("");
  const [filterStatus, setFilterStatus] = useState<PipelineStatus | "TODOS">("TODOS");

  const filtered = deals.filter((d) => {
    const matchSearch =
      d.title.toLowerCase().includes(search.toLowerCase())   ||
      d.company.toLowerCase().includes(search.toLowerCase()) ||
      (d.user?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "TODOS" || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Agrupar por columna kanban para vista de lista agrupada
  const grupos = ALL_STATUSES.map((s) => ({
    status: s,
    cfg:    STATUS_CFG[s],
    deals:  filtered.filter((d) => d.status === s),
  })).filter((g) => g.deals.length > 0 || filterStatus === g.status);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.04] shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar deal, empresa o cliente..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-1.5 pl-9 pr-4 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#FDCB02]/40 transition-all"
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
            Todos <span className="ml-1 opacity-60">{deals.length}</span>
          </button>
          {ALL_STATUSES.map((s) => {
            const cnt = deals.filter((d) => d.status === s).length;
            if (cnt === 0) return null;
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                  filterStatus === s
                    ? `${STATUS_CFG[s].cls}`
                    : "text-zinc-600 border-zinc-800 hover:text-zinc-400"
                }`}
              >
                {STATUS_CFG[s].label} <span className="ml-1 opacity-60">{cnt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[10px] text-zinc-700 uppercase tracking-widest">Sin deals</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#0a0a0a] z-10">
              <tr className="border-b border-white/[0.04] text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold">
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Deal / Empresa</th>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Actualizado</th>
                <th className="px-6 py-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {filtered.map((deal, idx) => {
                const s   = STATUS_CFG[deal.status];
                const won = deal.status === "CERRADO_GANADO";
                const lost = deal.status === "CERRADO_PERDIDO";
                return (
                  <motion.tr key={deal.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-white/[0.01] transition-colors group"
                  >
                    {/* Estado */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tight border ${s.cls}`}>
                          {s.label}
                        </span>
                      </div>
                    </td>

                    {/* Deal */}
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors truncate max-w-[160px]">
                        {deal.title}
                      </p>
                      <p className="text-[10px] text-zinc-600 uppercase tracking-widest">{deal.company}</p>
                    </td>

                    {/* Producto */}
                    <td className="px-6 py-4">
                      {deal.product ? (
                        <div>
                          <p className="text-xs font-bold text-zinc-400 truncate max-w-[120px]">{deal.product.title}</p>
                          <p className="text-[9px] font-mono text-zinc-700">{deal.product.sku}</p>
                        </div>
                      ) : <span className="text-zinc-700 text-xs">—</span>}
                    </td>

                    {/* Cliente */}
                    <td className="px-6 py-4">
                      {deal.user ? (
                        <div>
                          <p className="text-xs font-bold text-zinc-400 truncate max-w-[120px]">{deal.user.name}</p>
                          <p className="text-[9px] text-zinc-600 truncate max-w-[120px]">{deal.user.email}</p>
                        </div>
                      ) : <span className="text-zinc-700 text-xs">—</span>}
                    </td>

                    {/* Tiempo */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-zinc-600">
                        <Clock size={10} />
                        <span className="text-[10px] font-mono">{timeAgo(deal.updatedAt)}</span>
                      </div>
                    </td>

                    {/* Valor */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {won  && <TrendingUp  size={11} className="text-emerald-400" />}
                        {lost && <TrendingDown size={11} className="text-red-400"     />}
                        <span className={`text-sm font-black font-mono ${
                          won ? "text-emerald-400" : lost ? "text-red-400" : "text-[#FDCB02]"
                        }`}>
                          {fmt(deal.value)}
                        </span>
                      </div>
                      {deal.quantity && (
                        <p className="text-[9px] text-zinc-700 font-mono">
                          {deal.quantity.toLocaleString("es-MX")} uds
                        </p>
                      )}
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