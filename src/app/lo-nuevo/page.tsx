"use client"

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { products } from "@/lib/products"; // Asegúrate que esto apunte a tu data
import { useCart } from "@/lib/context/cart-context"; 
import { 
  Search, Package, Scissors, 
  Check, Ship, ArrowRight, 
  X, SlidersHorizontal,
  Zap, Scale, Ruler, Layers, Palette, 
  Radar, Clock, Activity, AlertCircle
} from "lucide-react";
import Image from "next/image";
import Lenis from 'lenis';

// --- UTILIDADES ---
const formatMoney = (amount: number) => 
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(amount);

const COLOR_MAP: Record<string, string> = {
  "Negro": "#000000", "Blanco": "#FFFFFF", "Marino": "#0f172a", 
  "Rojo": "#dc2626", "Rey": "#2563eb", "Gris": "#4b5563", 
  "Verde": "#059669", "Beige": "#d6d3d1"
};

const TECH_FILTERS = {
  structures: ["Single Jersey", "Piqué", "Interlock", "French Terry"],
  gsm_ranges: ["100-150g", "150-200g", "200-300g", ">300g"]
};

// --- COMPONENTES UI (TARJETA REUTILIZADA) ---
const ProductCard = ({ product }: { product: any }) => {
    const { addItem } = useCart();
    const [qtyKilo, setQtyKilo] = useState(1);
    const [qtyRollo, setQtyRollo] = useState(1);
    const [hovered, setHovered] = useState(false);

    const priceKilo = product.prices?.menudeo || 0; 
    const priceRollo = product.prices?.mayoreo || 0; 
    const rollWeight = 25; 
    const gsm = product.gsm || "180";
    const width = product.width || "1.60m";
    const totalRolloWeight = qtyRollo * rollWeight;
    const savings = priceKilo > 0 ? Math.round(((priceKilo - priceRollo) / priceKilo) * 100) : 0;

    return (
        <div 
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="bg-[#080808] border border-white/5 hover:border-[#FDCB02] transition-all duration-300 relative flex flex-col group overflow-hidden rounded-[2px]"
        >
            <div className="absolute top-0 left-0 w-full z-20 flex justify-between p-3 pointer-events-none">
                <span className="bg-black/90 backdrop-blur text-white text-[9px] font-mono font-bold px-1.5 py-0.5 border border-white/10 rounded-[2px]">
                    {product.id?.slice(-4) || "SKU"}
                </span>
                {/* ETIQUETA DE TIEMPO (NUEVO) */}
                <div className="bg-[#FDCB02] text-black px-2 py-0.5 text-[9px] font-[900] uppercase rounded-[2px] flex items-center gap-1 animate-pulse">
                    <Clock size={10} /> 24H
                </div>
            </div>

            <div className="relative h-64 w-full bg-[#050505] overflow-hidden border-b border-white/5">
                <Image 
                    src={product.thumbnail || "https://source.unsplash.com/random/600x600?fabric"} 
                    alt={product.title} 
                    fill 
                    className={`object-cover transition-transform duration-700 ${hovered ? 'scale-110 opacity-80' : 'scale-100 opacity-100'}`}
                />
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/90 to-transparent p-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className="text-lg font-[900] uppercase text-white leading-none tracking-tight mb-2 line-clamp-1">{product.title}</h3>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-neutral-400">
                        <div className="flex items-center gap-1"><Scale size={12} className="text-[#FDCB02]"/><span className="text-white">{gsm}</span> g/m²</div>
                        <div className="w-px h-3 bg-white/20"/><div className="flex items-center gap-1"><Ruler size={12} className="text-[#FDCB02]"/><span className="text-white">{width}</span></div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col mt-auto bg-[#080808]">
                 {/* Controles simplificados para esta vista */}
                <div className="px-4 py-3 bg-[#0a0a0a] relative border-t border-white/5">
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#FDCB02]"/>
                    <div className="flex justify-between items-center mb-2 pl-2">
                        <span className="text-[10px] font-[900] uppercase text-[#FDCB02] flex items-center gap-1"><Package size={10}/> Rollo <span className="text-[8px] bg-[#FDCB02]/10 px-1 rounded">-{savings}%</span></span>
                        <span className="text-xs font-bold text-[#FDCB02] font-mono">{formatMoney(priceRollo)}</span>
                    </div>
                    <button onClick={() => addItem({ ...product, price: priceRollo, quantity: totalRolloWeight, unit: 'Kg (Rollo)', variantId: 'rollo' })} className="w-full bg-[#FDCB02] text-black text-[9px] font-[900] uppercase rounded-[2px] h-8 flex items-center justify-center hover:bg-white transition-colors">
                        AÑADIR LOTE
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- PÁGINA LO NUEVO ---
export default function NewArrivalsPage() {
    
    // --- ESTADOS ---
    const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
    
    useEffect(() => {
        const lenis = new Lenis({ duration: 1.2, lerp: 0.1 });
        function raf(time: any) { lenis.raf(time); requestAnimationFrame(raf); }
        requestAnimationFrame(raf);
        return () => lenis.destroy();
    }, []);

    const toggleFilter = (item: string) => {
        setSelectedFilters(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    };

    // --- FILTRADO DE NUEVOS ---
    // Filtramos productos que tengan la propiedad 'new: true'
    // Si no tienes esa propiedad en tu DB mock, usamos slice para simular.
    const newProducts = useMemo(() => {
        const news = products.filter((p: any) => p.new === true);
        return news.length > 0 ? news : products.slice(0, 6); // Fallback por si no hay data marcada
    }, []);

    const filteredProducts = useMemo(() => {
        if (selectedFilters.length === 0) return newProducts;
        return newProducts.filter((p: any) => 
            selectedFilters.some(f => p.title.includes(f) || p.gsm === f || (p.category && p.category.includes(f)))
        );
    }, [newProducts, selectedFilters]);

    return (
        <div className="bg-[#030303] min-h-screen text-white font-sans selection:bg-[#FDCB02] selection:text-black pb-20 relative">
            
            {/* RUIDO DE FONDO */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay z-0" style={{ backgroundImage: `url("https://grainy-gradients.vercel.app/noise.svg")` }}></div>

            {/* --- 0. TICKER DE LOGÍSTICA (ESTILO TERMINAL) --- */}
            <div className="bg-[#FDCB02] text-black text-[9px] font-[900] uppercase tracking-widest py-1 overflow-hidden relative z-30">
                <div className="whitespace-nowrap flex gap-12 animate-marquee">
                    <span className="flex items-center gap-2"><Activity size={10}/> ENTRADAS EN TIEMPO REAL: MANZANILLO [ACTIVO]</span>
                    <span className="flex items-center gap-2"><Check size={10}/> LOTE #8821: PIQUÉ DRY-FIT LIBERADO</span>
                    <span className="flex items-center gap-2"><Ship size={10}/> BUQUE 'MSC OSCAR' ATRACADO - DESCARGANDO 12 CONTENEDORES</span>
                    <span className="flex items-center gap-2"><Zap size={10}/> NUEVAS TECNOLOGÍAS UV DISPONIBLES</span>
                </div>
            </div>

            {/* --- 1. HERO SECTION (INDUSTRIAL RADAR) --- */}
            <div className="relative h-[50vh] flex items-center bg-[#050505] border-b border-white/10 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#111] via-[#050505] to-black z-0"/>
                
                {/* Elemento Decorativo Radar */}
                <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full opacity-20 animate-[spin_10s_linear_infinite]">
                    <div className="absolute top-0 left-1/2 w-0.5 h-1/2 bg-gradient-to-t from-transparent to-[#FDCB02] origin-bottom -translate-x-1/2"/>
                </div>

                <div className="container mx-auto px-6 relative z-20 pt-10">
                    <div className="inline-flex items-center gap-3 border border-white/10 bg-white/5 backdrop-blur-md px-4 py-1.5 rounded-[2px] mb-6">
                        <Radar size={14} className="text-[#FDCB02] animate-pulse"/>
                        <span className="text-[10px] font-[900] uppercase tracking-[0.2em] text-white">Logística de Entrada</span>
                    </div>
                    
                    <h1 className="text-6xl md:text-8xl font-[1000] uppercase tracking-tighter leading-[0.85] mb-6 text-white">
                        RECIÉN <br/>
                        <span className="text-[#FDCB02]">DESEMBARCADO</span>
                    </h1>
                    
                    <p className="max-w-xl text-lg font-mono text-neutral-400 uppercase tracking-wide border-l-2 border-[#FDCB02] pl-4">
                        Acceso anticipado a los lotes que acaban de cruzar aduana. Disponibilidad limitada por alta demanda.
                    </p>
                </div>
            </div>

            {/* --- 2. LAYOUT PRINCIPAL --- */}
            <main className="container mx-auto px-6 py-12 flex gap-12 items-start relative z-10">
                
                {/* SIDEBAR FILTROS */}
                <aside className="w-64 sticky top-32 hidden lg:block overflow-y-auto max-h-[80vh] scrollbar-hide">
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                        <h3 className="font-[900] uppercase text-xs flex items-center gap-2 text-white"><SlidersHorizontal size={14} className="text-[#FDCB02]"/> Filtrar Novedades</h3>
                        {selectedFilters.length > 0 && <button onClick={() => setSelectedFilters([])} className="text-[9px] text-[#FDCB02] font-black uppercase">Limpiar</button>}
                    </div>

                    <div className="mb-10">
                        <h4 className="text-[10px] font-black uppercase text-neutral-500 mb-4 tracking-widest flex items-center gap-2"><Palette size={12}/> Color</h4>
                        <div className="grid grid-cols-5 gap-2">
                            {Object.entries(COLOR_MAP).map(([name, hex]) => (
                                <div 
                                    key={name} 
                                    onClick={() => toggleFilter(name)}
                                    title={name}
                                    className={`w-10 h-10 rounded-[2px] border cursor-pointer relative flex items-center justify-center transition-all ${selectedFilters.includes(name) ? 'border-[#FDCB02] ring-1 ring-[#FDCB02]' : 'border-white/10 hover:border-white'}`}
                                    style={{ backgroundColor: hex }}
                                >
                                    {selectedFilters.includes(name) && <Check size={14} className={name === 'Blanco' || name === 'Beige' ? 'text-black' : 'text-white'} strokeWidth={4}/>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mb-10">
                        <h4 className="text-[10px] font-black uppercase text-neutral-500 mb-4 tracking-widest flex items-center gap-2"><Layers size={12}/> Estructura</h4>
                        <ul className="space-y-1.5">
                            {TECH_FILTERS.structures.map((item) => (
                                <li key={item} onClick={() => toggleFilter(item)} className="flex items-center gap-3 py-1 cursor-pointer group">
                                    <div className={`w-3 h-3 border rounded-[1px] flex items-center justify-center transition-all ${selectedFilters.includes(item) ? 'bg-[#FDCB02] border-[#FDCB02]' : 'border-white/20 group-hover:border-white'}`}>
                                        {selectedFilters.includes(item) && <Check size={8} className="text-black stroke-[4]"/>}
                                    </div>
                                    <span className={`text-[11px] font-bold uppercase ${selectedFilters.includes(item) ? 'text-white' : 'text-neutral-500 group-hover:text-white'}`}>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>

                {/* GRID DE RESULTADOS */}
                <div className="flex-1 w-full min-w-0">
                    <div className="flex items-end justify-between mb-8 border-b border-white/10 pb-4 uppercase">
                        <div>
                            <h3 className="text-3xl font-[900] text-white italic tracking-tighter">Últimas Entradas</h3>
                            <p className="text-[10px] font-mono text-neutral-500 mt-1">Actualizado: hace 2 horas</p>
                        </div>
                        <span className="text-xs font-mono text-[#FDCB02] font-bold border border-[#FDCB02]/20 px-3 py-1 rounded-[2px] bg-[#FDCB02]/5">
                            {filteredProducts.length} LOTES ACTIVOS
                        </span>
                    </div>

                    {filteredProducts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredProducts.map((p: any) => (
                                <ProductCard key={p.id} product={p} />
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 border border-dashed border-white/10 rounded-[2px] flex flex-col items-center justify-center text-center">
                            <AlertCircle size={40} className="text-neutral-600 mb-4"/>
                            <h3 className="text-xl font-[900] uppercase text-white mb-2">Sin Coincidencias</h3>
                            <p className="text-sm text-neutral-500 max-w-md">No hay lotes nuevos con los filtros seleccionados. Intenta buscar en el catálogo general.</p>
                            <button onClick={() => setSelectedFilters([])} className="mt-6 text-[10px] font-black uppercase text-[#FDCB02] border-b border-[#FDCB02] hover:text-white hover:border-white transition-colors">
                                Limpiar Filtros
                            </button>
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}