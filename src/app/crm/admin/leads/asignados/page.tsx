"use client"

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Phone, MessageCircle, Mail, 
  MoreVertical, Filter, ArrowUpRight, 
  Calendar, Package, User
} from 'lucide-react';
import { products } from '@/lib/products'; 

// --- MOCK DATA: Leads Asignados (Textil B2B) ---
const assignedLeads = [
  { id: "L-8821", productId: "prod_diablo", client: "Roberto García", company: "Tácticos Elite", qty: 450, status: "Llamada pendiente", priority: "Alta", lastContact: "Hoy 9:00 AM" },
  { id: "L-8822", productId: "prod_felpa_china", client: "Ana Martínez", company: "Hoodie Lab", qty: 200, status: "Esperando anticipo", priority: "Media", lastContact: "Ayer" },
  { id: "L-8823", productId: "prod_alaska", client: "Julio César", company: "Sportswear MX", qty: 1500, status: "Enviar muestras", priority: "Alta", lastContact: "Hace 2h" },
  { id: "L-8824", productId: "lycra_metalica", client: "Elena Torres", company: "Boutique Gala", qty: 80, status: "Cotización enviada", priority: "Baja", lastContact: "Lunes" },
  { id: "L-8825", productId: "prod_sportok_escolar", client: "Marcos Polo", company: "Uniformes Bajío", qty: 3000, status: "Cierre pendiente", priority: "Alta", lastContact: "Hoy 10:30 AM" },
];

export default function AsignadosPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      
      {/* HEADER INTEGRADO */}
      <nav className="flex-none h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-black italic tracking-tighter text-[#FDCB02]">COYOTE <span className="text-white">CRM</span></h1>
          <div className="h-4 w-px bg-white/10" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-500">Leads Asignados</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
            <input 
              type="text" 
              placeholder="Buscar por cliente o empresa..." 
              className="bg-[#111] border-none rounded-full py-1.5 pl-9 pr-4 text-xs w-80 focus:ring-1 focus:ring-[#FDCB02] transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-2 text-neutral-400 hover:text-white transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col gap-6">
        
        {/* RESUMEN DE ACTIVIDAD RÁPIDO */}
        <div className="flex-none grid grid-cols-4 gap-4">
          {[
            { label: "Total Asignados", val: assignedLeads.length, color: "text-white" },
            { label: "Prioridad Alta", val: "3", color: "text-red-500" },
            { label: "Pendientes Hoy", val: "2", color: "text-[#FDCB02]" },
            { label: "Venta Proyectada", val: formatCurrency(1250000), color: "text-emerald-500" },
          ].map((stat, i) => (
            <div key={i} className="bg-[#0a0a0a] border border-white/[0.03] p-4 rounded-2xl">
              <p className="text-[8px] uppercase font-black tracking-widest text-neutral-500 mb-1">{stat.label}</p>
              <p className={`text-xl font-mono font-bold ${stat.color}`}>{stat.val}</p>
            </div>
          ))}
        </div>

        {/* TABLA DE TRABAJO */}
        <div className="flex-1 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-bold">
                  <th className="px-6 py-4">Prioridad</th>
                  <th className="px-6 py-4">Cliente / Empresa</th>
                  <th className="px-6 py-4">Tela / Pedido</th>
                  <th className="px-6 py-4">Estado Actual</th>
                  <th className="px-6 py-4">Último Contacto</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {assignedLeads
                  .filter(l => l.client.toLowerCase().includes(searchTerm.toLowerCase()) || l.company.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((lead) => {
                    const product = products.find(p => p.id === lead.productId);
                    return (
                      <motion.tr 
                        key={lead.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="hover:bg-white/[0.01] transition-colors group"
                      >
                        <td className="px-6 py-5">
                          <span className={`text-[8px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter ${
                            lead.priority === 'Alta' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                            lead.priority === 'Media' ? 'bg-[#FDCB02]/10 text-[#FDCB02] border border-[#FDCB02]/20' : 
                            'bg-neutral-500/10 text-neutral-500'
                          }`}>
                            {lead.priority}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white flex items-center gap-2">
                              {lead.client} <ArrowUpRight size={12} className="text-neutral-700 opacity-0 group-hover:opacity-100 transition-all" />
                            </span>
                            <span className="text-[10px] text-neutral-500 font-mono">{lead.company}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                              <Package size={14} className="text-[#FDCB02]" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-neutral-300">{product?.title}</span>
                              <span className="text-[10px] text-neutral-600 italic">{lead.qty} {product?.unit}s</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#FDCB02] animate-pulse" />
                            <span className="text-[11px] font-medium text-neutral-300">{lead.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-neutral-500">
                            <Calendar size={12} />
                            <span className="text-[10px] font-mono">{lead.lastContact}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-black transition-all">
                              <Phone size={14} fill="currentColor" />
                            </button>
                            <button className="p-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all">
                              <MessageCircle size={14} />
                            </button>
                            <button className="p-2 bg-white/5 text-white rounded-lg hover:bg-white/10">
                              <MoreVertical size={14} />
                            </button>
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
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #333; }
      `}} />
    </div>
  );
}