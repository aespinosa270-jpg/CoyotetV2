"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Mail, Phone, TrendingUp, Ticket, ShoppingBag } from "lucide-react";

type Cliente = {
  id:          string;
  name:        string | null;
  email:       string;
  phone:       string | null;
  createdAt:   string;
  totalDeals:  number;
  ganados:     number;
  totalValue:  number;
  _count:      { tickets: number; orders: number };
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

export default function ClientesClient({ clientes }: { clientes: Cliente[] }) {
  const [search,  setSearch]  = useState("");
  const [sortBy,  setSortBy]  = useState<"reciente" | "valor" | "deals">("reciente");

  const filtered = clientes
    .filter((c) =>
      (c.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "valor")   return b.totalValue  - a.totalValue;
      if (sortBy === "deals")   return b.totalDeals  - a.totalDeals;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04] shrink-0 gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-1.5 pl-9 pr-4 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#FDCB02]/40 transition-all"
          />
        </div>
        <div className="flex items-center gap-1">
          {(["reciente", "valor", "deals"] as const).map((s) => (
            <button key={s} onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                sortBy === s
                  ? "bg-[#FDCB02] text-black border-[#FDCB02]"
                  : "text-zinc-600 border-zinc-800 hover:text-zinc-400"
              }`}
            >
              {s === "reciente" ? "Reciente" : s === "valor" ? "Valor" : "Deals"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de tarjetas */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[10px] text-zinc-700 uppercase tracking-widest">Sin clientes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((c, idx) => {
              const initials = (c.name ?? c.email)
                .split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              const winRate = c.totalDeals > 0
                ? Math.round((c.ganados / c.totalDeals) * 100)
                : 0;

              return (
                <motion.div key={c.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="bg-zinc-900/40 border border-white/[0.04] rounded-2xl p-5 hover:border-white/10 transition-all group"
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#FDCB02] text-black text-xs font-black flex items-center justify-center shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate group-hover:text-[#FDCB02] transition-colors">
                        {c.name ?? "Sin nombre"}
                      </p>
                      <p className="text-[10px] text-zinc-600 truncate">{c.email}</p>
                    </div>
                  </div>

                  {/* Contacto */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                      <Mail size={10} className="shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </div>
                    {c.phone && (
                      <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                        <Phone size={10} className="shrink-0" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.04]">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <TrendingUp size={10} className="text-[#FDCB02]" />
                        <span className="text-[10px] font-black text-white font-mono">
                          {fmtShort(c.totalValue)}
                        </span>
                      </div>
                      <p className="text-[8px] text-zinc-700 uppercase tracking-widest">Facturado</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <span className="text-[10px] font-black text-white font-mono">
                          {winRate}%
                        </span>
                      </div>
                      <p className="text-[8px] text-zinc-700 uppercase tracking-widest">Win rate</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Ticket size={10} className={c._count.tickets > 0 ? "text-red-400" : "text-zinc-700"} />
                        <span className={`text-[10px] font-black font-mono ${c._count.tickets > 0 ? "text-red-400" : "text-zinc-600"}`}>
                          {c._count.tickets}
                        </span>
                      </div>
                      <p className="text-[8px] text-zinc-700 uppercase tracking-widest">Tickets</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <p className="text-[9px] text-zinc-700 mt-3 font-mono">
                    Cliente desde {new Date(c.createdAt).toLocaleDateString("es-MX", {
                      month: "short", year: "numeric",
                    })}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
