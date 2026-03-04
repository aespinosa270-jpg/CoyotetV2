"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  Search, Phone, MessageCircle,
  Package, Calendar, ArrowUpRight, Filter,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { PipelineStatus } from "@prisma/client";
import { moveDealAction } from "@/app/actions/deals";

type Deal = {
  id: string; title: string; company: string; value: number;
  status: PipelineStatus; updatedAt: Date;
  employee: { id: string; name: string };
  product:  { id: string; title: string; sku: string; unit: string } | null;
  user:     { id: string; name: string | null; email: string } | null;
};

const STATUS_LABEL: Record<PipelineStatus, string> = {
  PROSPECTO:       "Prospecto",
  COTIZANDO:       "Cotizando",
  NEGOCIACION:     "Negociación",
  CERRADO_GANADO:  "✓ Ganado",
  CERRADO_PERDIDO: "Perdido",
};

const STATUS_CLS: Record<PipelineStatus, string> = {
  PROSPECTO:       "bg-slate-800  text-slate-400  border-slate-700",
  COTIZANDO:       "bg-sky-900/40 text-sky-400    border-sky-800",
  NEGOCIACION:     "bg-amber-900/30 text-amber-400 border-amber-800",
  CERRADO_GANADO:  "bg-emerald-900/30 text-emerald-400 border-emerald-800",
  CERRADO_PERDIDO: "bg-red-950    text-red-400    border-red-900",
};

const PRIORITY_CLS = (value: number) =>
  value > 100000 ? "bg-red-500/10 text-red-400 border-red-800"
  : value > 30000 ? "bg-amber-500/10 text-amber-400 border-amber-800"
  : "bg-zinc-800 text-zinc-500 border-zinc-700";

const PRIORITY_LABEL = (value: number) =>
  value > 100000 ? "Alta" : value > 30000 ? "Media" : "Baja";

const fmt = (v: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(v);

export default function AsignadosClient({ deals }: { deals: Deal[] }) {
  const [search,     setSearch]     = useState("");
  const [statusFilt, setStatusFilt] = useState<PipelineStatus | "TODOS">("TODOS");
  const [, startTransition]         = useTransition();

  const filtered = deals.filter((d) => {
    const matchSearch =
      d.company.toLowerCase().includes(search.toLowerCase()) ||
      d.title.toLowerCase().includes(search.toLowerCase())   ||
      (d.user?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilt === "TODOS" || d.status === statusFilt;
    return matchSearch && matchStatus;
  });

  const handleAdvance = (dealId: string, current: PipelineStatus) => {
    const order: PipelineStatus[] = ["PROSPECTO","COTIZANDO","NEGOCIACION","CERRADO_GANADO"];
    const idx  = order.indexOf(current);
    if (idx < order.length - 1) {
      startTransition(() => { void moveDealAction(dealId, order[idx + 1]); });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0 gap-4">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente, empresa o deal..."
            className="bg-zinc-900 border border-zinc-800 rounded-full py-1.5 pl-9 pr-4 text-xs w-72 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#FDCB02] transition-all"
          />
        </div>
        {/* Filtro rápido de status */}
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-zinc-600" />
          {(["TODOS", "PROSPECTO", "COTIZANDO", "NEGOCIACION"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilt(s)}
              className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${
                statusFilt === s
                  ? "bg-[#FDCB02] text-black border-[#FDCB02]"
                  : "text-zinc-600 border-zinc-800 hover:border-zinc-600"
              }`}
            >
              {s === "TODOS" ? "Todos" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#0a0a0a] z-10">
            <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold">
              <th className="px-6 py-4">Prioridad</th>
              <th className="px-6 py-4">Deal / Empresa</th>
              <th className="px-6 py-4">Producto</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Agente</th>
              <th className="px-6 py-4">Última Act.</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-[10px] text-zinc-700 uppercase tracking-widest">
                  Sin resultados
                </td>
              </tr>
            )}
            {filtered.map((deal, idx) => (
              <motion.tr
                key={deal.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                className="hover:bg-white/[0.01] transition-colors group"
              >
                {/* Prioridad derivada del valor */}
                <td className="px-6 py-4">
                  <span className={`text-[8px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter border ${PRIORITY_CLS(deal.value)}`}>
                    {PRIORITY_LABEL(deal.value)}
                  </span>
                </td>

                {/* Deal + empresa */}
                <td className="px-6 py-4">
                  <Link href={`/crm/admin/leads/${deal.id}`} className="block group/link">
                    <p className="text-sm font-bold text-white flex items-center gap-1.5 leading-tight">
                      {deal.title}
                      <ArrowUpRight size={11} className="text-zinc-700 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{deal.company}</p>
                  </Link>
                </td>

                {/* Producto */}
                <td className="px-6 py-4">
                  {deal.product ? (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                        <Package size={12} className="text-[#FDCB02]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-300">{deal.product.title}</p>
                        <p className="text-[9px] text-zinc-600 font-mono">{deal.product.sku}</p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] text-zinc-700">—</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <span className={`text-[9px] font-bold px-2 py-1 rounded-full border uppercase tracking-widest ${STATUS_CLS[deal.status]}`}>
                    {STATUS_LABEL[deal.status]}
                  </span>
                </td>

                {/* Agente */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-[#FDCB02] text-black text-[8px] font-black flex items-center justify-center shrink-0">
                      {deal.employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[10px] text-zinc-400 truncate max-w-[80px]">{deal.employee.name}</span>
                  </div>
                </td>

                {/* Última actualización */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <Calendar size={11} />
                    <span className="text-[10px] font-mono">
                      {new Date(deal.updatedAt).toLocaleDateString("es-MX", {
                        day: "2-digit", month: "short",
                      })}
                    </span>
                  </div>
                </td>

                {/* Acciones */}
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-zinc-500 font-bold mr-1">{fmt(deal.value)}</span>
                    {/* Avanzar en pipeline */}
                    {!["CERRADO_GANADO","CERRADO_PERDIDO"].includes(deal.status) && (
                      <button
                        onClick={() => handleAdvance(deal.id, deal.status)}
                        className="p-1.5 bg-[#FDCB02]/10 text-[#FDCB02] rounded-lg hover:bg-[#FDCB02] hover:text-black transition-all"
                        title="Avanzar en pipeline"
                      >
                        <ChevronRight size={13} />
                      </button>
                    )}
                    <Link
                      href={`/crm/admin/leads/${deal.id}`}
                      className="p-1.5 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 transition-all"
                      title="Ver detalle"
                    >
                      <ArrowUpRight size={13} />
                    </Link>
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