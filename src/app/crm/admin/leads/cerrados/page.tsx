"use client"

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, TrendingUp, Download, CheckCircle2, 
  ArrowUpRight, Calendar, Package, User, 
  BarChart3, BadgeDollarSign
} from 'lucide-react';
import { products } from '@/lib/products'; 

// --- MOCK DATA: Tratos Ganados (Coyote Textil) ---
const closedDeals = [
  { id: "C-9001", productId: "prod_diablo", client: "Roberto García", company: "Tácticos Elite", qty: 2000, agent: "Carlos M.", date: "Hoy, 12:30 PM", profit: 110000 },
  { id: "C-9002", productId: "prod_sportok_escolar", client: "Marcos Polo", company: "Uniformes Bajío", qty: 5000, agent: "Ana S.", date: "Ayer", profit: 575000 },
  { id: "C-9003", productId: "prod_felpa_china", client: "Ana Martínez", company: "Hoodie Lab", qty: 1200, agent: "Javier F.", date: "01 Mar 2026", profit: 96000 },
  { id: "C-9004", productId: "prod_alaska", client: "Julio César", company: "Sportswear MX", qty: 3500, agent: "Carlos M.", date: "28 Feb 2026", profit: 297500 },
  { id: "C-9005", productId: "lycra_metalica", client: "Elena Torres", company: "Boutique Gala", qty: 500, agent: "Ana S.", date: "25 Feb 2026", profit: 20000 },
];

export default function CerradosPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

  const totalRevenue = closedDeals.reduce((acc, curr) => acc + curr.profit, 0);

  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      
      {/* NAV SUPERIOR */}
      <nav className="flex-none h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-black italic tracking-tighter text-[#FDCB02]">COYOTE <span className="text-white">CRM</span></h1>
          <div className="h-4 w-px bg-white/10" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-500">Tratos Cerrados</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
            <input 
              type="text" 
              placeholder="Buscar venta histórica..." 
              className="bg-[#111] border-none rounded-full py-1.5 pl-9 pr-4 text-xs w-80 focus:ring-1 focus:ring-emerald-500/50 transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all">
            <Download size={14} /> Exportar Reporte
          </button>
        </div>
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col gap-6">
        
        {/* DASHBOARD DE ÉXITO */}
        <div className="flex-none grid grid-cols-4 gap-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-3xl relative overflow-hidden group">
            <TrendingUp className="absolute -right-2 -bottom-2 text-emerald-500/10 group-hover:text-emerald-500/20 transition-all" size={80} />
            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-emerald-500 mb-2">Ingresos Totales (Periodo)</p>
            <p className="text-3xl font-mono font-bold text-white">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="bg-[#0a0a0a] border border-white/[0.03] p-5 rounded-3xl">
            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-neutral-500 mb-2">Volumen Despachado</p>
            <p className="text-3xl font-mono font-bold text-neutral-200">12,200 <span className="text-xs font-sans text-neutral-500 italic">Unidades</span></p>
          </div>
          <div className="bg-[#0a0a0a] border border-white/[0.03] p-5 rounded-3xl">
            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-neutral-500 mb-2">Top Closer</p>
            <p className="text-3xl font-mono font-bold text-[#FDCB02]">Ana S.</p>
          </div>
          <div className="bg-[#0a0a0a] border border-white/[0.03] p-5 rounded-3xl">
            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-neutral-500 mb-2">Efectividad de Cierre</p>
            <p className="text-3xl font-mono font-bold text-neutral-200">24.8%</p>
          </div>
        </div>

        {/* LISTA DE TRATOS FINALIZADOS */}
        <div className="flex-1 bg-[#0a0a0a] border border-white/[0.03] rounded-[40px] overflow-hidden flex flex-col shadow-2xl">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.3em] text-neutral-600 font-black">
                  <th className="px-8 py-6">ID / Fecha</th>
                  <th className="px-8 py-6">Cliente & Empresa</th>
                  <th className="px-8 py-6">Producto & Cantidad</th>
                  <th className="px-8 py-6">Agente</th>
                  <th className="px-8 py-6 text-right">Monto Cerrado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {closedDeals
                  .filter(d => d.company.toLowerCase().includes(searchTerm.toLowerCase()) || d.client.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((deal, idx) => {
                    const product = products.find(p => p.id === deal.productId);
                    return (
                      <motion.tr 
                        key={deal.id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="hover:bg-emerald-500/[0.02] transition-colors group cursor-pointer"
                      >
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-mono font-bold text-neutral-500 group-hover:text-emerald-500 transition-colors">#{deal.id}</span>
                            <span className="text-[10px] text-neutral-700">{deal.date}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-neutral-200 group-hover:text-white">{deal.client}</span>
                            <span className="text-[10px] text-neutral-500 uppercase tracking-widest">{deal.company}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-white/5 rounded-xl border border-white/5 group-hover:border-emerald-500/20 transition-all">
                              <Package size={16} className="text-emerald-500" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-neutral-300 italic">{product?.title}</span>
                              <span className="text-[10px] text-neutral-600">{deal.qty} {product?.unit}s despachados</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center border border-white/10 overflow-hidden">
                              <User size={12} className="text-neutral-500" />
                            </div>
                            <span className="text-xs font-medium text-neutral-400">{deal.agent}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1.5 text-emerald-500 font-mono font-black text-lg">
                              <CheckCircle2 size={16} />
                              {formatCurrency(deal.profit)}
                            </div>
                            <span className="text-[8px] uppercase tracking-tighter text-neutral-600 font-bold">Pago Confirmado</span>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #059669; }
        body { overflow: hidden; }
      `}} />
    </div>
  );
}