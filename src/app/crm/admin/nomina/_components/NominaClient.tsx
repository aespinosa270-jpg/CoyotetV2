"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, DollarSign, Target, CheckCircle2, UserCircle2, Download, Receipt } from "lucide-react";

const fmt = (v: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

type PayrollRow = {
  id: string;
  name: string;
  role: string;
  commissionRate: number;
  totalSales: number;
  totalCommission: number;
  dealsCount: number;
};

export default function NominaClient({ initialData }: { initialData: PayrollRow[] }) {
  const [query, setQuery] = useState("");
  // Estado local para "palomear" visualmente a quién ya se le pagó
  const [pagados, setPagados] = useState<Set<string>>(new Set());

  const filtered = initialData.filter(emp => 
    emp.name.toLowerCase().includes(query.toLowerCase()) || 
    emp.role.toLowerCase().includes(query.toLowerCase())
  );

  const togglePago = (id: string) => {
    setPagados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0a0a0a] border border-white/5 p-4 rounded-[2rem] shadow-xl">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input 
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Buscar agente o rol..."
            className="w-full bg-black border border-white/10 rounded-xl py-3 pl-12 pr-4 text-xs text-white focus:outline-none focus:border-[#FDCB02] transition-all font-mono"
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 text-white text-[10px] font-black tracking-widest uppercase hover:bg-zinc-800 transition-all rounded-xl border border-white/5">
          <Download size={14} /> Exportar Excel
        </button>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="flex-1 bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-[#0a0a0a] z-10">
              <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.3em] text-zinc-600 font-black">
                <th className="px-8 py-6">Vendedor / Agente</th>
                <th className="px-8 py-6 text-center">Deals Cerrados</th>
                <th className="px-8 py-6 text-right">Venta Total (Mes)</th>
                <th className="px-8 py-6 text-center">Tasa %</th>
                <th className="px-8 py-6 text-right">Comisión a Pagar</th>
                <th className="px-8 py-6 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-zinc-600 font-mono text-sm uppercase tracking-widest">
                    No hay datos de nómina para mostrar.
                  </td>
                </tr>
              ) : (
                filtered.map((emp, idx) => {
                  const isPaid = pagados.has(emp.id);
                  return (
                    <motion.tr 
                      key={emp.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                      className={`hover:bg-white/[0.01] transition-colors group ${isPaid ? 'opacity-50 grayscale' : ''}`}
                    >
                      {/* Agente */}
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-[#FDCB02]">
                            <UserCircle2 size={20} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white uppercase group-hover:text-[#FDCB02] transition-colors">
                              {emp.name}
                            </span>
                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">
                              {emp.role.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Deals Cerrados */}
                      <td className="px-8 py-6 text-center">
                        <span className="text-xs font-black text-zinc-400 bg-zinc-900 px-3 py-1 rounded-full border border-white/5">
                          {emp.dealsCount}
                        </span>
                      </td>

                      {/* Venta Total */}
                      <td className="px-8 py-6 text-right">
                        <p className="text-sm font-black font-mono text-zinc-300">
                          {fmt(emp.totalSales)}
                        </p>
                      </td>

                      {/* Tasa de Comisión */}
                      <td className="px-8 py-6 text-center">
                        <div className="inline-flex items-center gap-1 text-xs font-black text-[#FDCB02] bg-[#FDCB02]/10 px-2 py-1 rounded border border-[#FDCB02]/20">
                          <Target size={12} /> {emp.commissionRate}%
                        </div>
                      </td>

                      {/* Comisión a Pagar */}
                      <td className="px-8 py-6 text-right">
                        <p className="text-lg font-black font-mono text-emerald-400">
                          {fmt(emp.totalCommission)}
                        </p>
                      </td>

                      {/* Botón de Estado / Acción */}
                      <td className="px-8 py-6 text-center">
                        <button 
                          onClick={() => togglePago(emp.id)}
                          className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 w-full mx-auto max-w-[120px] ${
                            isPaid 
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                              : "bg-zinc-900 text-zinc-400 hover:bg-[#FDCB02] hover:text-black border border-white/5"
                          }`}
                        >
                          {isPaid ? (
                            <><CheckCircle2 size={12} /> Pagado</>
                          ) : (
                            <><Receipt size={12} /> Liquidar</>
                          )}
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #FDCB02; }
      `}} />
    </div>
  );
}