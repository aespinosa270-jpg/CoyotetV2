'use client';

import React from 'react';
import ProductCard from '@/components/product-card';
import { products } from '@/lib/products';
import { Target } from 'lucide-react';

export default function CatalogPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pt-24 pb-20">
      
      {/* Fondo */}
      <div className="fixed inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 max-w-7xl relative z-10">
        
        {/* Header Catálogo */}
        <div className="mb-12 border-b border-white/10 pb-8">
            <h1 className="text-5xl lg:text-7xl font-[1000] uppercase italic tracking-tighter mb-4 flex items-center gap-4">
               <Target size={48} className="text-[#FDCB02]" strokeWidth={1.5} />
               Catálogo <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/20">2026</span>
            </h1>
            <p className="text-neutral-400 font-mono text-sm max-w-2xl">
               SELECCIÓN DE TEXTILES DE ALTO RENDIMIENTO. TECNOLOGÍA DRY-FIT Y ACABADOS PREMIUM PARA CONFECCIÓN DEPORTIVA.
            </p>
        </div>

        {/* GRID DE PRODUCTOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
             /* 🔥 CORRECCIÓN: Mandamos el objeto completo como la tarjeta lo exige 🔥 */
             <ProductCard 
                key={product.id}
                product={product}
             />
          ))}
        </div>

      </div>
    </div>
  );
}