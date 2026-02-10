'use client';

import React, { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { 
  Search, ShoppingCart, ArrowRight, Filter, SlidersHorizontal, 
  LayoutGrid, PackageX, ChevronLeft, Loader2
} from 'lucide-react';
import { products } from '@/lib/products';
import { useCart } from '@/lib/context/cart-context';

// --- SEARCH RESULTS COMPONENT ---
function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q')?.toLowerCase() || '';
  const { addItem } = useCart();
  const [addingId, setAddingId] = useState<string | null>(null);

  // Filter products based on query
  const filteredProducts = useMemo(() => {
    if (!query) return products;
    return products.filter(p => 
      p.title.toLowerCase().includes(query) || 
      p.description.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query)
    );
  }, [query]);

  // Quick Add Handler
  const handleQuickAdd = (e: React.MouseEvent, product: any) => {
    e.preventDefault(); 
    e.stopPropagation();
    
    setAddingId(product.id);

    // Standardized Cart Item Structure
    addItem({
        id: `${product.id}-kilo`, // Default to Kilo mode
        productId: product.id,
        title: product.title,
        price: product.prices.menudeo, 
        image: product.thumbnail, 
        quantity: 1,
        unit: 'Kg',
        meta: { mode: 'kilo' }
    });

    setTimeout(() => setAddingId(null), 800);
  };

  return (
    <div className="container mx-auto px-4 lg:px-8 max-w-[1400px]">
      
      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b border-neutral-200">
        <div>
           <Link href="/" className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-black mb-4 transition-colors">
              <ChevronLeft size={12} /> Volver al catálogo
           </Link>
           <h1 className="text-3xl md:text-4xl font-black uppercase text-black flex items-center gap-3">
              <Search size={32} className="text-[#FDCB02]"/>
              Resultados: <span className="text-neutral-400 italic">"{query}"</span>
           </h1>
           <p className="text-xs text-neutral-500 font-medium mt-2">
              Se encontraron <strong className="text-black">{filteredProducts.length}</strong> coincidencias en el catálogo.
           </p>
        </div>
        
        {/* Filter Actions (Visual only for now) */}
        <div className="flex gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-neutral-200 rounded-md text-xs font-bold uppercase hover:border-black hover:bg-neutral-50 transition-all">
                <Filter size={14}/> Filtrar
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-neutral-200 rounded-md text-xs font-bold uppercase hover:border-black hover:bg-neutral-50 transition-all">
                <SlidersHorizontal size={14}/> Ordenar
            </button>
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-20">
          {filteredProducts.map((product) => (
            <Link 
                href={`/products/${product.id}`} 
                key={product.id} 
                className="group bg-white border border-neutral-200 rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
            >
                {/* Image Area */}
                <div className="aspect-[4/5] relative bg-neutral-100 overflow-hidden">
                    <Image 
                        src={product.thumbnail} 
                        alt={product.title} 
                        fill 
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    {product.hasRollo && (
                        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur text-white px-2 py-1 rounded text-[9px] font-bold uppercase shadow-sm">
                            Rollo Disp.
                        </div>
                    )}
                </div>

                {/* Info Area */}
                <div className="p-4 flex-1 flex flex-col">
                    <div className="mb-auto">
                        <h3 className="font-bold text-sm uppercase text-black leading-tight mb-1 group-hover:text-[#FDCB02] transition-colors line-clamp-2 min-h-[2.5em]">
                            {product.title}
                        </h3>
                        <p className="text-[10px] text-neutral-500 font-medium flex items-center gap-2">
                            <span className="bg-neutral-100 px-1.5 py-0.5 rounded">{product.gramaje}g</span>
                            <span className="bg-neutral-100 px-1.5 py-0.5 rounded">{product.ancho}</span>
                        </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] text-neutral-400 block font-medium uppercase">Precio Menudeo</span>
                            <span className="font-black text-black text-lg">${product.prices.menudeo}</span>
                        </div>
                        <button 
                            onClick={(e) => handleQuickAdd(e, product)}
                            disabled={addingId === product.id}
                            className={`
                                w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm
                                ${addingId === product.id 
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-[#FDCB02] text-black hover:bg-black hover:text-[#FDCB02]'
                                }
                            `}
                            title="Agregar 1kg rápido"
                        >
                            {addingId === product.id ? <ArrowRight size={18} /> : <ShoppingCart size={18} />}
                        </button>
                    </div>
                </div>
            </Link>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="min-h-[400px] flex flex-col items-center justify-center text-center space-y-6 opacity-70 py-20">
            <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mb-2">
                <PackageX size={48} className="text-neutral-400"/>
            </div>
            <div className="max-w-md">
                <h2 className="text-2xl font-black text-black uppercase mb-2">Sin resultados exactos</h2>
                <p className="text-sm text-neutral-500 mb-8">
                    No encontramos productos que coincidan con "<strong>{query}</strong>". 
                    Intenta buscar por tipo de tela (ej. "Piqué", "Microfibra") o uso (ej. "Deportivo").
                </p>
                <Link 
                    href="/" 
                    className="inline-flex items-center gap-2 px-8 py-3 bg-black text-white font-bold uppercase tracking-widest text-xs rounded hover:bg-[#FDCB02] hover:text-black transition-all"
                >
                    <LayoutGrid size={14}/> Ver todo el catálogo
                </Link>
            </div>
        </div>
      )}
    </div>
  );
}

// --- MAIN EXPORT WITH SUSPENSE ---
export default function SearchPage() {
  return (
    <div className="min-h-screen bg-neutral-50 font-sans pt-24 pb-20 selection:bg-[#FDCB02] selection:text-black">
      <Suspense fallback={
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-neutral-400">
              <Loader2 size={40} className="animate-spin text-[#FDCB02]" />
              <span className="font-bold uppercase tracking-widest text-xs">Buscando en catálogo...</span>
          </div>
      }>
        <SearchResults />
      </Suspense>
    </div>
  );
}