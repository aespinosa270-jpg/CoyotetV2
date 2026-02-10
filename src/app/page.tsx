"use client"

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link"; // <--- ESTO ES VITAL
import { products } from "@/lib/products"; 
import { useCart } from "@/lib/context/cart-context"; 
import { 
  Search, Plus, Minus, Package, Scissors, 
  Check, Ship, ArrowRight, 
  Flame, Flag, X, SlidersHorizontal,
  Zap, Trophy, ChevronRight, Star,
  Scale, Ruler, Layers, Palette, Sun
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
  structures: ["Single Jersey", "Piqué", "Interlock", "French Terry", "Rib"],
  gsm_ranges: ["100-150g", "150-200g", "200-300g", ">300g"]
};

// --- COMPONENTES UI ---

const ProductCard = ({ product }: { product: any }) => {
    const { addItem } = useCart();
    const [qtyKilo, setQtyKilo] = useState(1);
    const [qtyRollo, setQtyRollo] = useState(1);
    const [hovered, setHovered] = useState(false);

    // Protección contra valores nulos
    const priceKilo = product.prices?.menudeo || 0; 
    const priceRollo = product.prices?.mayoreo || 0; 
    const rollWeight = 25; 
    
    const gsm = product.gramaje || "180"; 
    const width = product.ancho || "1.60m"; 
    
    const totalRolloWeight = qtyRollo * rollWeight;
    const savings = priceKilo > 0 ? Math.round(((priceKilo - priceRollo) / priceKilo) * 100) : 0;

    return (
        <div 
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="min-w-[300px] w-[300px] md:min-w-[320px] md:w-[320px] bg-[#080808] border border-white/5 hover:border-[#FDCB02] transition-all duration-300 relative flex flex-col snap-start group overflow-hidden rounded-[2px]"
        >
            {/* Header Técnico */}
            <div className="absolute top-0 left-0 w-full z-20 flex justify-between p-3 pointer-events-none">
                <div className="flex gap-1">
                    <span className="bg-black/90 backdrop-blur text-white text-[9px] font-mono font-bold px-1.5 py-0.5 border border-white/10 rounded-[2px]">
                        {product.id?.replace('prod_', '').slice(0, 6).toUpperCase() || "SKU"}
                    </span>
                    {(product.origin === 'MX') && (
                        <span className="bg-white text-black px-1.5 py-0.5 text-[9px] font-[900] uppercase rounded-[2px]">MX</span>
                    )}
                </div>
                <div className="bg-[#FDCB02] text-black px-2 py-0.5 text-[9px] font-[900] uppercase rounded-[2px]">STOCK</div>
            </div>

            {/* --- ZONA CLICKEABLE (IMAGEN Y TÍTULO) --- */}
            {/* Solo esto es el enlace */}
            <Link href={`/products/${product.id}`} className="block relative h-64 w-full bg-[#050505] overflow-hidden border-b border-white/5 cursor-pointer">
                <Image 
                    src={product.thumbnail || "/assets/products/112.jpg"} 
                    alt={product.title} 
                    fill 
                    className={`object-cover transition-transform duration-700 ${hovered ? 'scale-110 opacity-80' : 'scale-100 opacity-100'}`}
                />
                
                {/* Overlay con Título */}
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/90 to-transparent p-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className="text-lg font-[900] uppercase text-white leading-none tracking-tight mb-2 line-clamp-1 group-hover:text-[#FDCB02] transition-colors">
                        {product.title}
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-neutral-400">
                        <div className="flex items-center gap-1"><Scale size={12} className="text-[#FDCB02]"/><span className="text-white">{gsm}</span> g/m²</div>
                        <div className="w-px h-3 bg-white/20"/><div className="flex items-center gap-1"><Ruler size={12} className="text-[#FDCB02]"/><span className="text-white">{width}</span></div>
                    </div>
                </div>
            </Link>

            {/* --- CONTROLES DE COMPRA (FUERA DEL LINK) --- */}
            <div className="flex flex-col mt-auto bg-[#080808]">
                {/* Opción Muestra / Kilo */}
                <div className="px-4 py-3 border-b border-white/5 hover:bg-[#111] transition-colors">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold uppercase text-neutral-500 flex items-center gap-1"><Scissors size={10}/> Corte / Kilo</span>
                        <span className="text-xs font-bold text-white font-mono">{formatMoney(priceKilo)}<span className="text-[9px] text-neutral-600">/kg</span></span>
                    </div>
                    <div className="flex h-7 gap-2">
                        <div className="flex w-20 border border-white/10 bg-black rounded-[2px]">
                            <button onClick={() => setQtyKilo(Math.max(1, qtyKilo - 1))} className="w-6 flex items-center justify-center text-white hover:text-[#FDCB02]"><Minus size={10}/></button>
                            <span className="flex-1 flex items-center justify-center text-[10px] font-bold text-white border-x border-white/10">{qtyKilo}</span>
                            <button onClick={() => setQtyKilo(qtyKilo + 1)} className="w-6 flex items-center justify-center text-white hover:text-[#FDCB02]"><Plus size={10}/></button>
                        </div>
                        <button onClick={() => addItem({ ...product, price: priceKilo, quantity: qtyKilo, unit: 'Kg', variantId: 'corte' })} className="flex-1 bg-white hover:bg-[#FDCB02] text-black text-[9px] font-[900] uppercase rounded-[2px] transition-colors">AGREGAR</button>
                    </div>
                </div>

                {/* Opción Rollo (Mayoreo) */}
                <div className="px-4 py-3 bg-[#0a0a0a] relative">
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#FDCB02]"/>
                    <div className="flex justify-between items-center mb-2 pl-2">
                        <span className="text-[10px] font-[900] uppercase text-[#FDCB02] flex items-center gap-1"><Package size={10}/> Rollo <span className="text-[8px] bg-[#FDCB02]/10 px-1 rounded">-{savings}%</span></span>
                        <span className="text-xs font-bold text-[#FDCB02] font-mono">{formatMoney(priceRollo)}</span>
                    </div>
                    <div className="flex h-8 gap-2 pl-2">
                        <div className="flex w-20 border border-[#FDCB02]/20 bg-black rounded-[2px]">
                            <button onClick={() => setQtyRollo(Math.max(1, qtyRollo - 1))} className="w-6 flex items-center justify-center text-white hover:text-[#FDCB02]"><Minus size={10}/></button>
                            <span className="flex-1 flex items-center justify-center text-[10px] font-bold text-white border-x border-[#FDCB02]/10">{qtyRollo}</span>
                            <button onClick={() => setQtyRollo(qtyRollo + 1)} className="w-6 flex items-center justify-center text-white hover:text-[#FDCB02]"><Plus size={10}/></button>
                        </div>
                        <button onClick={() => addItem({ ...product, price: priceRollo, quantity: totalRolloWeight, unit: 'Kg (Rollo)', variantId: 'rollo' })} className="flex-1 bg-[#FDCB02] hover:bg-white text-black text-[9px] font-[900] uppercase rounded-[2px] leading-none flex flex-col items-center justify-center transition-colors">
                            <span>LLEVAR LOTE</span>
                            <span className="text-[7px] opacity-70 mt-0.5">~{totalRolloWeight}KG</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProductRail = ({ title, items, icon: Icon, isNational = false }: { title: string, items: any[], icon?: any, isNational?: boolean }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const amount = direction === 'left' ? -800 : 800;
            scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };
    if (!items || items.length === 0) return null;
    return (
        <section className="mb-20 border-b border-white/5 pb-10 relative group/section">
            <div className="flex items-end justify-between mb-8 px-1">
                <div className="flex items-center gap-4">
                    {Icon && (
                        <div className={`p-3 rounded-[2px] border ${isNational ? 'bg-green-900/20 border-green-500/30 text-green-500' : 'bg-[#FDCB02]/10 border-[#FDCB02]/30 text-[#FDCB02]'}`}>
                            <Icon size={24} strokeWidth={1.5}/>
                        </div>
                    )}
                    <div>
                        <h3 className="text-3xl md:text-5xl font-[1000] uppercase text-white italic tracking-tighter leading-none">{title}</h3>
                        {isNational && <p className="text-xs text-green-500/80 font-mono mt-2 uppercase tracking-widest flex items-center gap-2"><Flag size={10}/> Apoya la industria local • Envío Inmediato</p>}
                    </div>
                </div>
                <div className="hidden md:flex gap-1">
                    <button onClick={() => scroll('left')} className="w-12 h-12 flex items-center justify-center border border-white/10 bg-[#0a0a0a] text-white hover:bg-white hover:text-black transition-colors rounded-[2px]"><ArrowRight className="rotate-180" size={20}/></button>
                    <button onClick={() => scroll('right')} className="w-12 h-12 flex items-center justify-center border border-white/10 bg-[#0a0a0a] text-white hover:bg-white hover:text-black transition-colors rounded-[2px]"><ArrowRight size={20}/></button>
                </div>
            </div>
            <div ref={scrollRef} className="flex overflow-x-auto gap-4 pb-8 scrollbar-hide -mx-6 px-6 snap-x snap-mandatory">
                {items.map((product, i) => <ProductCard key={product.id || i} product={product} />)}
            </div>
        </section>
    );
};

export default function CoyoteMarketplace() {
    const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
    
    // --- EFECTO DE SCROLL SUAVE (Lenis) ---
    useEffect(() => {
        const lenis = new Lenis({ duration: 1.2, lerp: 0.1 });
        function raf(time: any) { lenis.raf(time); requestAnimationFrame(raf); }
        requestAnimationFrame(raf);
        return () => lenis.destroy();
    }, []);

    const toggleFilter = (item: string) => {
        setSelectedFilters(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    };

    // --- LOGICA DE DATOS ---
    const bestSellers = useMemo(() => products.slice(0, 8), []); 
    
    const sportProducts = useMemo(() => products.filter((p: any) => 
        p.title.includes('Dry') || p.title.includes('Sport') || p.id.includes('micropique')
    ), []);
    
    const nationalProducts = useMemo(() => products.filter((p: any) => 
        p.title.includes('Nacional') || p.id.includes('apolo')
    ), []);
    
    const trendingProducts = useMemo(() => products.slice(-6), []);

    return (
        <div className="bg-[#030303] min-h-screen text-white font-sans selection:bg-[#FDCB02] selection:text-black pb-20 relative">
            
            <div className="fixed inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

            {/* HERO SECTION */}
            <div className="relative h-[85vh] flex items-center bg-[#050505] border-b border-white/10 overflow-hidden">
                <Image src="/hero1.png" alt="Coyote Industrial" fill className="object-cover opacity-60" priority />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent z-10"/>
                <div className="container mx-auto px-6 relative z-20 pt-20">
                    <div className="inline-flex items-center gap-3 border-l-4 border-[#FDCB02] pl-6 mb-8 uppercase text-xs font-[900] tracking-[0.3em] text-[#FDCB02]">Infraestructura Nacional</div>
                    
                    <div className="flex flex-col mb-10 leading-[0.85]">
                        <h1 className="text-7xl md:text-[8vw] font-[1000] uppercase text-white tracking-tighter drop-shadow-2xl">
                            VISTIENDO LA FUERZA
                        </h1>
                        <h1 className="text-7xl md:text-[9vw] font-[1000] uppercase text-[#FDCB02] tracking-tighter drop-shadow-2xl">
                            DE MÉXICO
                        </h1>
                    </div>
                    
                    <p className="text-2xl md:text-3xl text-white font-[900] max-w-3xl mb-12 uppercase italic tracking-tight">
                        Control absoluto del suministro. Sin rivales. Sin excusas.
                    </p>
                    
                    <div className="flex gap-5">
                        <Link href="/contenedor" className="bg-[#FDCB02] text-black h-16 px-12 flex items-center justify-center font-[900] uppercase text-sm tracking-widest rounded-[2px] hover:bg-white transition-colors">Cotizar Contenedor</Link>
                        <button className="h-16 px-12 border border-white/20 bg-black/50 backdrop-blur text-white flex items-center justify-center font-[900] uppercase text-sm tracking-widest rounded-[2px] hover:bg-white hover:text-black transition-colors">
                             Ver Stock
                        </button>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-6 py-16 flex gap-12 items-start relative z-10">
                
                {/* SIDEBAR (Filtros) */}
                <aside className="w-72 sticky top-32 hidden lg:block overflow-y-auto max-h-[80vh] scrollbar-hide">
                    {/* ... (Contenido del sidebar, igual que antes) ... */}
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                        <h3 className="font-[900] uppercase text-xs flex items-center gap-2 text-white"><SlidersHorizontal size={14} className="text-[#FDCB02]"/> Especificaciones</h3>
                        {selectedFilters.length > 0 && <button onClick={() => setSelectedFilters([])} className="text-[9px] text-[#FDCB02] font-black uppercase">Limpiar</button>}
                    </div>

                    {/* Filtro Colores */}
                    <div className="mb-12">
                        <h4 className="text-[10px] font-black uppercase text-neutral-500 mb-4 tracking-widest flex items-center gap-2"><Palette size={12}/> Gama Cromática</h4>
                        <div className="grid grid-cols-5 gap-2">
                            {Object.entries(COLOR_MAP).map(([name, hex]) => (
                                <div 
                                    key={name} 
                                    onClick={() => toggleFilter(name)}
                                    title={name}
                                    className={`w-10 h-10 rounded-[2px] border cursor-pointer relative flex items-center justify-center transition-all ${selectedFilters.includes(name) ? 'border-[#FDCB02] scale-110 ring-1 ring-[#FDCB02]' : 'border-white/10 hover:border-white'}`}
                                    style={{ backgroundColor: hex }}
                                >
                                    {selectedFilters.includes(name) && <Check size={14} className={name === 'Blanco' || name === 'Beige' ? 'text-black' : 'text-white'} strokeWidth={4}/>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Filtro Estructura */}
                    <div className="mb-12">
                        <h4 className="text-[10px] font-black uppercase text-neutral-500 mb-4 tracking-widest flex items-center gap-2"><Layers size={12}/> Estructura</h4>
                        <ul className="space-y-2">
                            {TECH_FILTERS.structures.map((item) => (
                                <li key={item} onClick={() => toggleFilter(item)} className="flex items-center gap-3 py-1 cursor-pointer group hover:bg-white/5 rounded px-2 -mx-2 transition-colors">
                                    <div className={`w-3 h-3 border rounded-[1px] flex items-center justify-center transition-all ${selectedFilters.includes(item) ? 'bg-[#FDCB02] border-[#FDCB02]' : 'border-white/20 group-hover:border-white'}`}>
                                        {selectedFilters.includes(item) && <Check size={8} className="text-black stroke-[4]"/>}
                                    </div>
                                    <span className={`text-[11px] font-bold uppercase ${selectedFilters.includes(item) ? 'text-white' : 'text-neutral-500 group-hover:text-white'}`}>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* CTA Sidebar */}
                    <div className="mt-8 p-6 bg-[#111] border border-white/10 relative overflow-hidden group rounded-[2px] hover:border-[#FDCB02]/50 transition-colors">
                        <div className="absolute -right-4 -top-4 text-[#FDCB02]/5 group-hover:text-[#FDCB02]/10 transition-colors duration-500">
                             <Ship size={100} strokeWidth={1}/>
                        </div>
                        <h5 className="font-[900] uppercase text-white text-xs mb-2 relative z-10">Contenedor<br/>Directo</h5>
                        <p className="text-[10px] text-neutral-400 font-medium leading-relaxed mb-4 relative z-10">
                            Precios CIF/FOB para pedidos mayores a 10 Toneladas.
                        </p>
                        <Link href="/contenedor" className="inline-flex items-center gap-2 text-[#FDCB02] text-[9px] font-black uppercase tracking-widest hover:text-white transition-colors relative z-10 border-b border-[#FDCB02] pb-0.5 hover:border-white">
                            INICIAR TRÁMITE <ArrowRight size={10}/>
                        </Link>
                    </div>
                </aside>

                {/* CONTENIDO PRINCIPAL - CARRILES */}
                <div className="flex-1 w-full min-w-0">
                    <div className="space-y-16 animate-in fade-in duration-700">
                        
                        <ProductRail title="Top Ventas Mayoreo" items={bestSellers} icon={Trophy}/>

                        {sportProducts.length > 0 && (
                             <ProductRail title="Textiles Deportivos" items={sportProducts} icon={Zap}/>
                        )}

                        {/* BANNER INTERMEDIO */}
                        <div className="w-full h-40 relative rounded-[2px] overflow-hidden group border border-white/10 flex items-center px-12 bg-[#111]">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"/>
                            <div className="relative z-10 flex flex-col items-start gap-2">
                                <div className="flex items-center gap-2 text-[#FDCB02] mb-1">
                                    <Sun size={18}/> <span className="text-[11px] font-black uppercase tracking-widest">Tecnología UV-Shield</span>
                                </div>
                                <h3 className="text-3xl font-[900] uppercase text-white italic tracking-tighter">Protección Solar Certificada</h3>
                                <p className="text-sm text-neutral-400 font-mono mt-1">Disponible en Piqué y Microfibra para uniformes escolares.</p>
                            </div>
                            <button className="ml-auto bg-white hover:bg-[#FDCB02] text-black px-8 py-4 text-[11px] font-[900] uppercase tracking-widest transition-colors rounded-[2px]">
                                Ver Colección
                            </button>
                        </div>

                        {nationalProducts.length > 0 && (
                            <ProductRail title="Producción Nacional" items={nationalProducts} icon={Flag} isNational={true}/>
                        )}

                        <ProductRail title="Tendencias de Compra" items={trendingProducts} icon={Flame}/>

                        {/* GRID FINAL COMPLETO */}
                        <section className="pt-8 border-t border-white/10">
                            <div className="flex items-end justify-between mb-8 pb-4 uppercase">
                                <h3 className="text-4xl font-[900] text-white italic tracking-tighter">Catálogo Global</h3>
                                <span className="text-xs font-mono text-neutral-500 font-bold border border-white/10 px-3 py-1 rounded-[2px] bg-[#0a0a0a]">{products.length} Referencias</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-y-12 gap-x-8">
                                {products.map((p) => <ProductCard key={p.id} product={p} />)}
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}