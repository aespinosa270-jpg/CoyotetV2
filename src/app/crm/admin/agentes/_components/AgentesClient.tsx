"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, MoreVertical, Clock, TrendingUp, Target, Mail } from "lucide-react";
import Link from "next/link";
import { EmployeeRole } from "@prisma/client";

type Agente = {
  id:          string;
  name:        string;
  email:       string;
  role:        EmployeeRole;
  isOnline:    boolean;
  lastCheckIn: string | null;  // ← string, no Date
  totalDeals:  number;
  ventasMes:   number;
  winRate:     number;
};

const ROLE_LABEL: Record<EmployeeRole, string> = {
  ADMIN:        "Admin",
  SUPERVISOR:   "Supervisor",
  VENDEDORA:    "Vendedora",
  LOGISTICA:    "Logística",
  CONTABILIDAD: "Contabilidad",
};

const fmt = (v: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(v);

export default function AgentesClient({ agentes }: { agentes: Agente[] }) {
  const [search, setSearch] = useState("");

  const lista    = agentes ?? [];
  const filtered = lista.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase())  ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="relative">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar agente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-full py-2.5 pl-11 pr-5 text-sm focus:outline-none focus:border-[#FDCB02] transition-all w-64 text-white placeholder:text-zinc-600"
          />
        </div>
        <Link
          href="/crm/admin/agentes/nuevo"
          className="bg-[#FDCB02] text-black hover:bg-yellow-300 px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2"
        >
          <Plus size={14} /> Nuevo Agente
        </Link>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-zinc-600 bg-zinc-950/50">
              <th className="px-6 py-4 font-bold">Agente</th>
              <th className="px-6 py-4 font-bold">Estado</th>
              <th className="px-6 py-4 font-bold">Rol</th>
              <th className="px-6 py-4 font-bold text-right">Deals</th>
              <th className="px-6 py-4 font-bold text-right">Ventas (Mes)</th>
              <th className="px-6 py-4 font-bold text-right">Win Rate</th>
              <th className="px-6 py-4 font-bold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-[10px] text-zinc-700 uppercase tracking-widest">
                  {lista.length === 0 ? "Sin agentes registrados" : "Sin resultados"}
                </td>
              </tr>
            )}
            {filtered.map((agent, idx) => (
              <motion.tr
                key={agent.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="hover:bg-white/[0.02] transition-colors group"
              >
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#FDCB02] text-black flex items-center justify-center text-xs font-black shrink-0">
                      {agent.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">{agent.name}</p>
                      <p className="text-[10px] text-zinc-600 flex items-center gap-1 mt-0.5">
                        <Mail size={9} /> {agent.email}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      {agent.isOnline && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      )}
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${agent.isOnline ? "bg-emerald-500" : "bg-zinc-700"}`} />
                    </span>
                    <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                      {agent.isOnline ? "En Línea" : "Desconectado"}
                    </span>
                  </div>
                  {!agent.isOnline && agent.lastCheckIn && (
                    <p className="text-[9px] text-zinc-700 mt-1 flex items-center gap-1">
                      <Clock size={9} />
                      {new Date(agent.lastCheckIn).toLocaleDateString("es-MX", {
                        day: "2-digit", month: "short",
                      })}
                    </p>
                  )}
                </td>

                <td className="px-6 py-5">
                  <span className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    {ROLE_LABEL[agent.role]}
                  </span>
                </td>

                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Target size={12} className="text-zinc-600" />
                    <span className="font-mono text-sm font-bold text-zinc-400">{agent.totalDeals}</span>
                  </div>
                </td>

                <td className="px-6 py-5 text-right">
                  <span className={`font-bold font-mono ${agent.ventasMes > 0 ? "text-emerald-400" : "text-zinc-600"}`}>
                    {agent.ventasMes > 0 ? fmt(agent.ventasMes) : "—"}
                  </span>
                </td>

                <td className="px-6 py-5 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className={`font-mono text-sm font-bold ${
                      agent.winRate >= 30 ? "text-[#FDCB02]"
                      : agent.winRate >= 15 ? "text-zinc-300"
                      : "text-zinc-600"
                    }`}>
                      {agent.totalDeals > 0 ? `${agent.winRate}%` : "—"}
                    </span>
                    {agent.totalDeals > 0 && (
                      <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FDCB02] rounded-full"
                          style={{ width: `${Math.min(agent.winRate, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </td>

                <td className="px-6 py-5 text-center">
                  <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/crm/admin/agentes/${agent.id}`}
                      className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <TrendingUp size={14} />
                    </Link>
                    <button className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                      <MoreVertical size={14} />
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