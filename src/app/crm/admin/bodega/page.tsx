"use client"

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Package, ArrowRightLeft, AlertTriangle, 
  MapPin, Plus, Filter, RefreshCw, Layers, Truck
} from 'lucide-react';
import { products } from '@/lib/products'; 

// Esto simularía tu Server Action: import { getStockByLocation } from '@/app/actions/inventory'

export default function BodegaPage() {
  // Usamos tus Enums reales del schema de Prisma
  const [activeLocation, setActiveLocation] = useState<"GUATEMALA_97" | "PLOMO_203">("GUATEMALA_97");
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulación de fetch a BD
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      
      {/* HEADER BODEGA */}
      <nav className="flex-none h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-black italic tracking-tighter text-[#FDCB02]">COYOTE <span className="text-white">CRM</span></h1>
          <div className="h-4 w-px bg-white/10" />
          
          {/* Selector de Sucursal (Mapeado a tu Enum PickupLocation) */}
          <div className="flex bg-[#111] p-1 rounded-full border border-white/5">
            <button 
              onClick={() => setActiveLocation("GUATEMALA_97")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                activeLocation === "GUATEMALA_97" ? 'bg-[#FDCB02] text-black' : 'text-neutral-500 hover:text-white'
              }`}
            >
              <MapPin size={12} /> Guatemala 97
            </button>
            <button 
              onClick={() => setActiveLocation("PLOMO_203")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                activeLocation === "PLOMO_203" ? 'bg-[#FDCB02] text-black' : 'text-neutral-500 hover:text-white'
              }`}
            >
              <MapPin size={12} /> Plomo 203
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
            <input 
              type="text" 
              placeholder="Buscar SKU, tela o color..." 
              className="bg-[#111] border-none rounded-full py-1.5 pl-9 pr-4 text-xs w-72 focus:ring-1 focus:ring-[#FDCB02] transition-all text-white placeholder-neutral-700"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={handleRefresh}
            className="p-2 text-neutral-400 hover:text-[#FDCB02] transition-colors"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin text-[#FDCB02]" : ""} />
          </button>
          <button className="bg-[#FDCB02] text-black px-5 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-yellow-400 transition-all flex items-center gap-2">
            <Plus size={14} /> Registrar Entrada
          </button>
        </div>
      </nav>

      {/* DASHBOARD DE STOCK */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col gap-6">
        
        {/* KPIs de la Sucursal */}
        <div className="flex-none grid grid-cols-4 gap-4">
          <div className="bg-[#0a0a0a] border border-white/[0.03] p-5 rounded-[24px]">
            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-neutral-500 mb-2">Valor de Inventario</p>
            <p className="text-3xl font-mono font-bold text-white">$4.2M <span className="text-xs text-neutral-600">MXN</span></p>
          </div>
          <div className="bg-[#0a0a0a] border border-white/[0.03] p-5 rounded-[24px]">
            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-neutral-500 mb-2">Rollos en Piso</p>
            <p className="text-3xl font-mono font-bold text-white">1,450</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-[24px] relative overflow-hidden group cursor-pointer">
            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-red-500 mb-2">Niveles Críticos (Out of Stock)</p>
            <p className="text-3xl font-mono font-bold text-red-500">12 <span className="text-xs text-red-500/50 uppercase tracking-widest font-sans">SKUs</span></p>
            <AlertTriangle className="absolute -right-4 -bottom-4 text-red-500/10 group-hover:text-red-500/20 transition-all" size={80} />
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-[24px] cursor-pointer">
            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-blue-400 mb-2">Restock Interno (En Tránsito)</p>
            <p className="text-3xl font-mono font-bold text-blue-400 flex items-center gap-3">
              3 <span className="text-[10px] text-blue-400/60 uppercase tracking-widest font-sans bg-blue-500/20 px-2 py-1 rounded">Órdenes Activas</span>
            </p>
          </div>
        </div>

        {/* TABLA DE INVENTARIO FÍSICO */}
        <div className="flex-1 bg-[#0a0a0a] border border-white/[0.03] rounded-[40px] overflow-hidden flex flex-col shadow-2xl">
          <div className="p-4 border-b border-white/5 bg-[#0d0d0d] flex justify-between items-center">
             <h3 className="text-xs font-black uppercase tracking-widest text-[#FDCB02] ml-4">
               Catálogo de Telas • {activeLocation.replace('_', ' ')}
             </h3>
             <button className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white bg-white/5 px-3 py-1.5 rounded-lg transition-all">
               <ArrowRightLeft size={12} /> Solicitar Traspaso (RouteOrder)
             </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.3em] text-neutral-600 font-black">
                  <th className="px-8 py-4">Tela / Material</th>
                  <th className="px-8 py-4">Colores Disponibles</th>
                  <th className="px-8 py-4">Categoría</th>
                  <th className="px-8 py-4 text-right">Nivel de Stock</th>
                  <th className="px-8 py-4 text-right">Precio Mayoreo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {products
                  .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((product, idx) => {
                    // Simulamos un nivel de stock aleatorio para visualización
                    const stockLevel = Math.floor(Math.random() * 100);
                    const isLowStock = stockLevel < 15;

                    return (
                      <motion.tr 
                        key={product.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className="hover:bg-white/[0.01] transition-colors group"
                      >
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-white/10 overflow-hidden flex-shrink-0">
                              <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white leading-tight">{product.title}</span>
                              <span className="text-[10px] text-neutral-500 font-mono mt-0.5">{product.composicion} • {product.gramaje}g</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          {product.colors && product.colors.length > 0 ? (
                            <div className="flex -space-x-1">
                              {product.colors.slice(0, 5).map((color, i) => (
                                <div 
                                  key={i} 
                                  className="w-5 h-5 rounded-full border border-[#1a1a1a] shadow-sm"
                                  style={{ backgroundColor: color.hex }}
                                  title={color.name}
                                />
                              ))}
                              {product.colors.length > 5 && (
                                <div className="w-5 h-5 rounded-full border border-[#1a1a1a] bg-neutral-800 flex items-center justify-center text-[8px] font-bold">
                                  +{product.colors.length - 5}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-neutral-600 italic">Color único</span>
                          )}
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-[9px] font-bold uppercase tracking-tighter bg-white/5 px-2 py-1 rounded text-neutral-400">
                            {product.category.split('/')[0]}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs font-mono font-bold ${isLowStock ? 'text-red-500' : 'text-emerald-500'}`}>
                              {stockLevel} Rollos
                            </span>
                            {/* Barra de progreso de stock */}
                            <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${isLowStock ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                style={{ width: `${Math.max(stockLevel, 5)}%` }} 
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <span className="font-mono text-sm font-black text-[#FDCB02]">
                            ${product.prices.mayoreo.toFixed(2)}
                          </span>
                          <span className="text-[9px] text-neutral-600 ml-1">/{product.unit}</span>
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
        body { overflow: hidden; }
      `}} />
    </div>
  );
}