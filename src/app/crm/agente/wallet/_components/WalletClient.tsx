"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, Clock, CheckCircle2, XCircle,
  Wallet, ArrowUpRight, Search, BadgePercent,
} from "lucide-react";
import { CommissionStatus } from "@prisma/client";

type DealInfo = {
  id:        string;
  title:     string;
  company:   string;
  value:     number;
  updatedAt: string;
  user:      { name: string; email: string } | null;
};

type Commission = {
  id:         string;
  amount:     number;
  rate:       number;
  status:     CommissionStatus;
  approvedAt: string | null;
  paidAt:     string | null;
  notes:      string | null;
  createdAt:  string;
  deal:       DealInfo;
};

type Kpis = {
  totalAprobado:   number;
  totalPendiente:  number;
  totalPagado:     number;
  totalComisiones: number;
  rate:            number;
};

const STATUS_CFG: Record<CommissionStatus, {
  label: string; cls: string; icon: React.ReactNode;
}> = {
  PENDIENTE:  { label: "Pendiente",  cls: "bg-amber-500/10 text-amber-400 border-amber-800",      icon: <Clock        size={11} /> },
  APROBADA:   { label: "Aprobada",   cls: "bg-emerald-500/10 text-emerald-400 border-emerald-800", icon: <CheckCircle2 size={11} /> },
  PAGADA:     { label: "Pagada",     cls: "bg-sky-500/10 text-sky-400 border-sky-800",             icon: <Wallet       size={11} /> },
  RECHAZADA:  { label: "Rechazada",  cls: "bg-red-500/10 text-red-400 border-red-800",             icon: <XCircle      size={11} /> },
};

const fmt = (v: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(v);

const fmtShort = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`;
  return fmt(v);
};

export default function WalletClient({
  commissions,
  kpis,
  porMes,
  employeeName,
}: {
  commissions:  Commission[];
  kpis:         Kpis;
  porMes:       { label: string; amount: number }[];
  employeeName: string;
}) {
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState<CommissionStatus | "TODOS">("TODOS");

  const filtered = commissions.filter((c) => {
    const matchSearch =
      c.deal.title.toLowerCase().includes(search.toLowerCase())   ||
      c.deal.company.toLowerCase().includes(search.toLowerCase()) ||
      (c.deal.user?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "TODOS" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const maxBar = Math.max(...porMes.map((m) => m.amount), 1);

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-hidden">

      {/* ── TOP: Balance hero + barras ── */}
      <div className="grid grid-cols-3 gap-4 shrink-0">

        {/* Balance principal */}
        <div className="col-span-1 bg-gradient-to-br from-[#FDCB02]/20 to-[#FDCB02]/5 border border-[#FDCB02]/30 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
          <TrendingUp className="absolute -right-4 -top-4 text-[#FDCB02]/10" size={80} />
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#FDCB02] mb-1">
              Saldo Aprobado
            </p>
            <p className="text-4xl font-mono font-black text-white tracking-tighter">
              {fmtShort(kpis.totalAprobado)}
            </p>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">
              Listo para cobrar
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#FDCB02]/10">
            <BadgePercent size={12} className="text-[#FDCB02]" />
            <p className="text-[10px] text-zinc-400">
              Tasa: <span className="text-[#FDCB02] font-black">{(kpis.rate * 100).toFixed(0)}%</span> por deal cerrado
            </p>
          </div>
        </div>

        {/* Sub KPIs */}
        <div className="col-span-1 flex flex-col gap-3">
          <div className="flex-1 bg-[#0a0a0a] border border-white/[0.03] rounded-2xl p-4 flex flex-col justify-between">
            <p className="text-[8px] uppercase font-black tracking-widest text-zinc-600">En Revisión</p>
            <div>
              <p className="text-xl font-mono font-bold text-amber-400">{fmtShort(kpis.totalPendiente)}</p>
              <p className="text-[9px] text-zinc-700 mt-0.5">Esperando aprobación</p>
            </div>
          </div>
          <div className="flex-1 bg-[#0a0a0a] border border-white/[0.03] rounded-2xl p-4 flex flex-col justify-between">
            <p className="text-[8px] uppercase font-black tracking-widest text-zinc-600">Ya Cobrado</p>
            <div>
              <p className="text-xl font-mono font-bold text-sky-400">{fmtShort(kpis.totalPagado)}</p>
              <p className="text-[9px] text-zinc-700 mt-0.5">Historial pagado</p>
            </div>
          </div>
        </div>

        {/* Barras mensuales */}
        <div className="col-span-1 bg-[#0a0a0a] border border-white/[0.03] rounded-2xl p-5 flex flex-col">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-4">
            Últimos 6 meses
          </p>
          <div className="flex-1 flex items-end justify-between gap-2">
            {porMes.map((m, i) => {
              const pct = maxBar > 0 ? (m.amount / maxBar) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <span className="text-[8px] font-mono text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    {fmtShort(m.amount)}
                  </span>
                  <div className="w-full relative" style={{ height: "60px" }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(pct, 3)}%` }}
                      transition={{ delay: i * 0.08, duration: 0.5 }}
                      className="absolute bottom-0 w-full bg-zinc-800 group-hover:bg-[#FDCB02] rounded-t-lg transition-colors"
                    />
                  </div>
                  <span className="text-[8px] font-bold text-zinc-700 uppercase">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── TABLA DE COMISIONES ── */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.04] shrink-0 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar deal o cliente..."
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
              Todas <span className="ml-1 opacity-60">{commissions.length}</span>
            </button>
            {(Object.keys(STATUS_CFG) as CommissionStatus[]).map((s) => {
              const cnt = commissions.filter((c) => c.status === s).length;
              if (cnt === 0) return null;
              const cfg = STATUS_CFG[s];
              return (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                    filterStatus === s ? cfg.cls : "text-zinc-600 border-zinc-800 hover:text-zinc-400"
                  }`}
                >
                  {cfg.icon} {cfg.label}
                  <span className="opacity-60">{cnt}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Wallet size={32} className="text-zinc-800" />
              <p className="text-[10px] text-zinc-700 uppercase tracking-widest">
                Sin comisiones aún
              </p>
              <p className="text-[9px] text-zinc-800 uppercase tracking-widest">
                Cierra deals para generar comisiones
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                <tr className="border-b border-white/[0.04] text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold">
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Deal</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Valor Deal</th>
                  <th className="px-6 py-4">Tasa</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4 text-right">Comisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {filtered.map((c, idx) => {
                  const cfg = STATUS_CFG[c.status];
                  return (
                    <motion.tr key={c.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-white/[0.01] transition-colors group"
                    >
                      {/* Estado */}
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 w-fit text-[9px] font-black px-2 py-1 rounded-full border uppercase tracking-tight ${cfg.cls}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>

                      {/* Deal */}
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors truncate max-w-[140px]">
                          {c.deal.title}
                        </p>
                        <p className="text-[10px] text-zinc-600 uppercase tracking-widest">{c.deal.company}</p>
                      </td>

                      {/* Cliente */}
                      <td className="px-6 py-4">
                        <p className="text-xs text-zinc-400 truncate max-w-[120px]">
                          {c.deal.user?.name ?? "—"}
                        </p>
                      </td>

                      {/* Valor deal */}
                      <td className="px-6 py-4">
                        <p className="text-xs font-mono text-zinc-500">{fmt(c.deal.value)}</p>
                      </td>

                      {/* Tasa */}
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black text-zinc-500 font-mono">
                          {(c.rate * 100).toFixed(0)}%
                        </span>
                      </td>

                      {/* Fecha */}
                      <td className="px-6 py-4">
                        <p className="text-[10px] font-mono text-zinc-600">
                          {new Date(c.createdAt).toLocaleDateString("es-MX", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </p>
                        {c.paidAt && (
                          <p className="text-[9px] font-mono text-sky-500 mt-0.5">
                            Pagado {new Date(c.paidAt).toLocaleDateString("es-MX", {
                              day: "2-digit", month: "short",
                            })}
                          </p>
                        )}
                      </td>

                      {/* Monto */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <ArrowUpRight size={11} className="text-[#FDCB02]" />
                          <span className="text-sm font-black font-mono text-[#FDCB02]">
                            {fmt(c.amount)}
                          </span>
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
    </div>
  );
}
