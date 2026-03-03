"use client"

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Truck, Package, ChevronRight, DollarSign } from 'lucide-react';
import { products } from '@/lib/products'; 

// --- PEDIDOS DE EJEMPLO CON TUS TELAS REALES ---
const initialDeals = [
  { id: "CT-101", productId: "prod_diablo", company: "Tácticos del Norte", qty: 500, stage: "prospectos", color: "Negro" },
  { id: "CT-102", productId: "prod_sportok_escolar", company: "Uniformes Puebla", qty: 1200, stage: "muestreo", color: "Azul Rey" },
  { id: "CT-103", productId: "prod_felpa_china", company: "Hoodies MX", qty: 850, stage: "cotizacion", color: "Vino" },
  { id: "CT-104", productId: "prod_alaska", company: "Deportes Elite", qty: 2000, stage: "produccion", color: "Blanco" },
  { id: "CT-105", productId: "lycra_metalica", company: "Circo de la Ciudad", qty: 150, stage: "cotizacion", color: "Oro" },
  { id: "CT-106", productId: "prod_polar", company: "PetStyle", qty: 400, stage: "muestreo", color: "Marino" },
];

const stages = [
  { id: "prospectos", title: "Prospectos", color: "#64748b" },
  { id: "muestreo", title: "Muestreo", color: "#3b82f6" },
  { id: "cotizacion", title: "Cotización", color: "#FDCB02" },
  { id: "produccion", title: "Logística", color: "#10b981" }
];

export default function PipelineCoyoteFull() {
  const [searchTerm, setSearchTerm] = useState("");

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

  const getDealInfo = (deal: any) => {
    const product = products.find(p => p.id === deal.productId);
    const total = product ? (deal.qty * product.prices.mayoreo) : 0;
    return { product, total };
  };

  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      
      {/* HEADER COMPACTO */}
      <nav className="flex-none h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-black italic tracking-tighter text-[#FDCB02]">COYOTE <span className="text-white">CRM</span></h1>
          <div className="h-4 w-px bg-white/10" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
            <input 
              type="text" 
              placeholder="Buscar tela o cliente..." 
              className="bg-[#111] border-none rounded-full py-1.5 pl-9 pr-4 text-xs w-64 focus:ring-1 focus:ring-[#FDCB02] transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <button className="bg-[#FDCB02] text-black px-5 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-yellow-400 transition-all flex items-center gap-2">
          <Plus size={14} /> Nuevo Pedido
        </button>
      </nav>

      {/* BOARD: Grid de 4 columnas fijas para evitar scroll horizontal */}
      <div className="flex-1 grid grid-cols-4 gap-4 p-4 h-full overflow-hidden">
        {stages.map((stage) => {
          const stageDeals = initialDeals.filter(d => d.stage === stage.id);
          const totalValue = stageDeals.reduce((acc, d) => acc + getDealInfo(d).total, 0);

          return (
            <div key={stage.id} className="flex flex-col min-w-0 h-full bg-[#0a0a0a] rounded-2xl border border-white/[0.03]">
              
              {/* Header Columna */}
              <div className="p-4 border-b border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    {stage.title}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-600">{stageDeals.length}</span>
                </div>
                <p className="text-xl font-light tracking-tighter text-white">
                  {formatCurrency(totalValue)}
                </p>
              </div>

              {/* Lista de Tarjetas con scroll vertical independiente */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {stageDeals
                  .filter(d => d.company.toLowerCase().includes(searchTerm.toLowerCase()) || d.productId.includes(searchTerm.toLowerCase()))
                  .map((deal) => {
                    const { product, total } = getDealInfo(deal);
                    return (
                      <motion.div 
                        key={deal.id}
                        whileHover={{ scale: 0.98 }}
                        className="bg-[#121212] border border-white/5 rounded-xl p-4 cursor-pointer hover:border-white/20 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-[#FDCB02] uppercase tracking-tighter truncate">
                              {product?.title}
                            </p>
                            <h3 className="font-bold text-sm text-white truncate leading-tight">{deal.company}</h3>
                          </div>
                          <ChevronRight size={14} className="text-neutral-700 group-hover:text-white flex-shrink-0" />
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-white/5 rounded-lg p-2">
                            <p className="text-[8px] uppercase text-neutral-500 font-bold mb-0.5">Cantidad</p>
                            <p className="text-[10px] font-mono text-neutral-200">{deal.qty} {product?.unit}s</p>
                          </div>
                          <div className="bg-white/5 rounded-lg p-2">
                            <p className="text-[8px] uppercase text-neutral-500 font-bold mb-0.5">Color</p>
                            <p className="text-[10px] font-mono text-neutral-200">{deal.color}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                          <div className="flex items-center gap-1 text-neutral-600">
                            <Truck size={10} />
                            <span className="text-[9px] font-bold uppercase tracking-tighter">{deal.id}</span>
                          </div>
                          <p className="text-xs font-black text-white">
                            {formatCurrency(total)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #333; }
        body { overflow: hidden; }
      `}} />
    </div>
  );
}