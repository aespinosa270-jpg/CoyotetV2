"use client"

import { useSearchParams } from "next/navigation";
import { products } from "@/lib/products"; // Tu base de datos local
import { useCart } from "@/lib/context/cart-context";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowLeft, Package, Check, AlertCircle, ShoppingBag } from "lucide-react";

// --- CONF INDUSTRIAL ---
const ROLL_WEIGHT_KG = 26;
const ROLL_LENGTH_M = 100;

// --- TARJETA DE RESULTADO (Reutilizando la lógica Pro) ---
function SearchResultCard({ product, index }: { product: any, index: number }) {
  const { addItem } = useCart();
  const [activeMode, setActiveMode] = useState<'rollo' | 'corte' | null>(null);
  
  const isKilo = product.unit === 'Kilo';
  const unitLabel = isKilo ? 'Kg' : 'Mt';
  const rollContent = isKilo ? ROLL_WEIGHT_KG : ROLL_LENGTH_M;
  const rollPriceTotal = (product.prices.mayoreo || 0) * rollContent;

  const handleAdd = (mode: 'rollo' | 'corte') => {
    setActiveMode(mode);
    const qty = mode === 'rollo' ? rollContent : 1;
    const price = mode === 'rollo' ? product.prices.mayoreo : product.prices.menudeo;

    addItem({
      title: product.title,
      price: price,
      variantId: mode,
      quantity: qty,
      unit: product.unit,
      thumbnail: product.thumbnail
    });
    setTimeout(() => setActiveMode(null), 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-white border border-black/10 flex flex-col h-full hover:border-black transition-colors duration-300"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[#e5e5e5]">
         <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-500" />
         <Image 
            src={product.thumbnail} 
            alt={product.title} 
            fill 
            className="object-cover grayscale-[30%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
         />
      </div>

      <div className="p-6 flex flex-col flex-grow justify-between">
        <div className="mb-4">
            <h3 className="text-lg font-black uppercase tracking-tighter leading-none mb-2">{product.title}</h3>
            <span className="text-[10px] font-mono text-slate-400 uppercase">
                Stock ID: {(index + 900).toString(16).toUpperCase()}
            </span>
        </div>

        <div className="space-y-2">
            <button 
                onClick={() => handleAdd('rollo')}
                className="w-full h-12 bg-black text-white flex justify-between items-center px-4 hover:bg-[#FDCB02] hover:text-black transition-all group/btn"
            >
                <div className="flex flex-col items-start">
                    <span className="text-[9px] font-black uppercase tracking-widest">Rollo</span>
                    <span className="text-[8px] font-mono opacity-60">~{rollContent}{unitLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm">${rollPriceTotal.toLocaleString('es-MX')}</span>
                    {activeMode === 'rollo' ? <Check size={14}/> : <Package size={14}/>}
                </div>
            </button>
            <button 
                onClick={() => handleAdd('corte')}
                className="w-full py-2 border border-black/10 hover:border-black flex justify-between items-center px-4 transition-all text-[10px] font-bold uppercase tracking-widest"
            >
                <span>Corte</span>
                <span className="font-mono">${product.prices.menudeo.toFixed(2)}</span>
            </button>
        </div>
      </div>
    </motion.div>
  );
}

// --- CONTENIDO DE BÚSQUEDA ---
function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.toLowerCase() || "";
  
  // LÓGICA DE FILTRADO REAL
  const results = products.filter((product) => {
    const titleMatch = product.title.toLowerCase().includes(query);
    const descMatch = product.description?.toLowerCase().includes(query);
    // Si tuvieras tags o categorías, agrégalas aquí
    return titleMatch || descMatch;
  });

  return (
    <div className="min-h-screen bg-white text-black pt-12 pb-24">
      
      {/* HEADER DE RESULTADOS */}
      <div className="container mx-auto px-6 mb-12">
        <Link href="/" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black mb-8 transition-colors">
            <ArrowLeft size={12} /> Volver al Catálogo
        </Link>
        
        <div className="border-b border-black pb-8">
            <h1 className="text-4xl md:text-6xl font-[1000] uppercase tracking-tighter italic mb-4">
                Resultados para: <span className="text-[#FDCB02]">"{query}"</span>
            </h1>
            <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
                {results.length} Referencias encontradas en inventario
            </p>
        </div>
      </div>

      {/* GRILLA DE RESULTADOS O EMPTY STATE */}
      <div className="container mx-auto px-6">
        {results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {results.map((product, i) => (
                    <SearchResultCard key={product.id} product={product} index={i} />
                ))}
            </div>
        ) : (
            // EMPTY STATE INDUSTRIAL
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-black/10 bg-[#fafafa]">
                <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center mb-6">
                    <Search size={32} className="text-slate-400" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Sin coincidencias exactas</h3>
                <p className="text-sm text-slate-500 max-w-md text-center mb-8">
                    No encontramos "{query}" en el stock actual. Intenta buscando por tipo de tela (ej. "Dry Fit", "Algodón") o uso (ej. "Escolar").
                </p>
                <div className="flex gap-4">
                    <Link href="/" className="px-8 py-4 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-[#FDCB02] hover:text-black transition-colors">
                        Ver Todo el Stock
                    </Link>
                    <Link href="/ayuda" className="px-8 py-4 border border-black font-bold uppercase tracking-widest text-xs hover:bg-black hover:text-white transition-colors">
                        Contactar Ventas
                    </Link>
                </div>
            </div>
        )}
      </div>

    </div>
  );
}

// --- PÁGINA EXPORTADA (Con Suspense para evitar errores de build en Next.js) ---
export default function SearchPage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
            <span className="font-black uppercase tracking-widest animate-pulse">Buscando en Almacén...</span>
        </div>
    }>
        <SearchContent />
    </Suspense>
  );
}