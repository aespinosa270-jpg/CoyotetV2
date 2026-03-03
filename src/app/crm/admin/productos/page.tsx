"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, Plus, Search, Edit3, Loader2 } from 'lucide-react';
import { getProducts } from '@/app/actions/products'; // Tu Server Action

export default function ProductosPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadCatalog() {
      const data = await getProducts();
      setProducts(data);
      setIsLoading(false);
    }
    loadCatalog();
  }, []);

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      
      {/* HEADER DE LA SECCIÓN */}
      <nav className="flex-none h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-black italic tracking-tighter text-[#FDCB02]">COYOTE <span className="text-white">CRM</span></h1>
          <div className="h-4 w-px bg-white/10" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-500">Catálogo Maestro</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
            <input 
              type="text" 
              placeholder="Buscar por SKU o Tela..." 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#111] border-none rounded-full py-1.5 pl-9 pr-4 text-xs w-72 focus:ring-1 focus:ring-[#FDCB02] outline-none text-white placeholder-neutral-700"
            />
          </div>
          {/* BOTÓN PARA RUTA DEDICADA DE CREACIÓN */}
          <Link 
            href="/crm/admin/productos/nuevo"
            className="bg-[#FDCB02] text-black px-5 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-yellow-400 transition-all flex items-center gap-2"
          >
            <Plus size={14} /> Agregar Tela
          </Link>
        </div>
      </nav>

      {/* TABLA PRINCIPAL DE PRODUCTOS */}
      <main className="flex-1 p-8 overflow-hidden flex flex-col">
        <div className="flex-1 bg-[#0a0a0a] border border-white/[0.03] rounded-[40px] overflow-hidden flex flex-col shadow-2xl">
          <div className="p-5 border-b border-white/5 flex items-center gap-3 bg-[#0d0d0d]">
             <Package className="text-[#FDCB02]" size={18} />
             <h3 className="text-xs font-black uppercase tracking-widest text-white">Inventario (Base de Datos Real)</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/5">
                <tr className="text-[9px] uppercase tracking-[0.3em] text-neutral-600 font-black">
                  <th className="px-8 py-6">Tela / SKU</th>
                  <th className="px-8 py-6">Categoría</th>
                  <th className="px-8 py-6">Unidad</th>
                  <th className="px-8 py-6 text-right">Menudeo</th>
                  <th className="px-8 py-6 text-right">Mayoreo</th>
                  <th className="px-8 py-6 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {isLoading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-neutral-500"><Loader2 className="animate-spin mx-auto" /></td></tr>
                ) : filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-4">
                      <span className="text-white font-bold block">{p.title}</span>
                      <span className="text-[10px] text-[#FDCB02] font-mono mt-1 block">{p.sku}</span>
                    </td>
                    <td className="px-8 py-4 text-xs text-neutral-400 uppercase">{p.category}</td>
                    <td className="px-8 py-4 text-xs text-neutral-500 font-mono">{p.unit}</td>
                    <td className="px-8 py-4 text-right text-xs font-mono text-emerald-500">${p.priceMenudeo.toFixed(2)}</td>
                    <td className="px-8 py-4 text-right text-xs font-mono font-black text-white">${p.priceMayoreo.toFixed(2)}</td>
                    <td className="px-8 py-4 text-right">
                      {/* LINK A RUTA DEDICADA DE EDICIÓN */}
                      <Link 
                        href={`/crm/admin/productos/${p.id}/editar`}
                        className="inline-flex p-2 text-neutral-600 hover:text-[#FDCB02] hover:bg-white/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Edit3 size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
      `}} />
    </div>
  );
}