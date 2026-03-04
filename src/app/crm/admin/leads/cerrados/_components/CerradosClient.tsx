"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, CheckCircle2, XCircle } from "lucide-react";
import { PipelineStatus, UnitType } from "@prisma/client";

type Deal = {
  id:         string;
  title:      string;
  company:    string;
  value:      number;
  quantity:   number | null;
  status:     PipelineStatus;
  color:      string | null;
  createdAt:  string;
  updatedAt:  string;
  employee:   { id: string; name: string };
  product:    { id: string; title: string; sku: string; unit: UnitType } | null;
  user:       { id: string; name: string | null; email: string } | null;
};

const fmt = (v: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(v);

export default function CerradosClient({
  ganados,
  perdidos,
}: {
  ganados:  Deal[];
  perdidos: Deal[];
}) {
  const [tab,    setTab]    = useState<"ganados" | "perdidos">("ganados");
  const [search, setSearch] = useState("");

  const lista = tab === "ganados" ? ganados : perdidos;

  const filtered = lista.filter(
    (d) =>
      d.company.toLowerCase().includes(search.toLowerCase()) ||
      d.title.toLowerCase().includes(search.toLowerCase())   ||
      (d.user?.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden">

      {/* Tabs + búsqueda */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0 gap-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTab("ganados")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
              tab === "ganados"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-800"
                : "text-zinc-600 border-transparent hover:text-zinc-400"
            }`}
          >
            <CheckCircle2 size={11} />
            Ganados
            <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded font-mono text-[9px]">
              {ganados.length}
            </span>
          </button>
          <button
            onClick={() => setTab("perdidos")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
              tab === "perdidos"
                ? "bg-red-500/10 text-red-400 border-red-800"
                : "text-zinc-600 border-transparent hover:text-zinc-400"
            }`}
          >
            <XCircle size={11} />
            Perdidos
            <span className="bg-red-500/20 px-1.5 py-0.5 rounded font-mono text-[9px]">
              {perdidos.length}
            </span>
          </button>
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empresa, deal o cliente..."
            className="bg-zinc-900 border border-zinc-800 rounded-full py-1.5 pl-9 pr-4 text-xs w-64 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#0a0a0a] z-10">
            <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold">
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Deal / Empresa</th>
              <th className="px-6 py-4">Producto</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Agente</th>
              <th className="px-6 py-4 text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[10px] text-zinc-700 uppercase tracking-widest">
                  Sin deals {tab === "ganados" ? "ganados" : "perdidos"}
                </td>
              </tr>
            )}
            {filtered.map((deal, idx) => (
              <motion.tr
                key={deal.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                className={`transition-colors group ${
                  tab === "ganados"
                    ? "hover:bg-emerald-500/[0.02]"
                    : "hover:bg-red-500/[0.02]"
                }`}
              >
                {/* Fecha */}
                <td className="px-6 py-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                    tab === "ganados"
                      ? "bg-emerald-500/10 border-emerald-500/20"
                      : "bg-red-500/10 border-red-500/20"
                  }`}>
                    {tab === "ganados"
                      ? <CheckCircle2 size={14} className="text-emerald-400" />
                      : <XCircle     size={14} className="text-red-400"     />
                    }
                  </div>
                </td>

                {/* Deal / Empresa */}
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors truncate max-w-[160px]">
                    {deal.title}
                  </p>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest">{deal.company}</p>
                  <p className="text-[9px] font-mono text-zinc-700 mt-0.5">
                    {new Date(deal.updatedAt).toLocaleDateString("es-MX", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </p>
                </td>

                {/* Producto */}
                <td className="px-6 py-4">
                  {deal.product ? (
                    <div>
                      <p className="text-xs font-bold text-zinc-400 truncate max-w-[120px]">{deal.product.title}</p>
                      <p className="text-[9px] font-mono text-zinc-600">{deal.product.sku}</p>
                    </div>
                  ) : (
                    <span className="text-zinc-700 text-xs">—</span>
                  )}
                </td>

                {/* Cliente */}
                <td className="px-6 py-4">
                  {deal.user ? (
                    <div>
                      <p className="text-xs font-bold text-zinc-400">{deal.user.name ?? deal.user.email}</p>
                      <p className="text-[9px] text-zinc-600 truncate max-w-[120px]">{deal.user.email}</p>
                    </div>
                  ) : (
                    <span className="text-zinc-700 text-xs">—</span>
                  )}
                </td>

                {/* Agente */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-[#FDCB02] text-black text-[8px] font-black flex items-center justify-center shrink-0">
                      {deal.employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[10px] text-zinc-500 truncate max-w-[80px]">{deal.employee.name}</span>
                  </div>
                </td>

                {/* Monto */}
                <td className="px-6 py-4 text-right">
                  <p className={`text-sm font-black font-mono ${
                    tab === "ganados" ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {fmt(deal.value)}
                  </p>
                  {deal.quantity && (
                    <p className="text-[9px] text-zinc-600 font-mono">
                      {deal.quantity.toLocaleString("es-MX")} {deal.product?.unit ?? "uds"}
                    </p>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}