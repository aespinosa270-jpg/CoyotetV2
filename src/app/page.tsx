"use client"

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { products } from "@/lib/products"; 
import { useCart } from "@/lib/context/cart-context"; 
import { 
  Search, Plus, Minus, Package, Scissors, 
  Check, Ship, ArrowRight, 
  Flame, Flag, X, SlidersHorizontal,
  Zap, Trophy, ChevronRight, ChevronLeft, Star,
  Scale, Ruler, Layers, Palette, Sun, Filter, Circle, Info, Weight,
  BicepsFlexed
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

// 1. PRODUCT CARD PREMIUM (INTACTO)
const ProductCard = ({ product, className = "" }: { product: any, className?: string }) => {
    const { addItem } = useCart();
    
    // Estado Visual
    const [activeImage, setActiveImage] = useState(product.thumbnail);
    const [selectedColorName, setSelectedColorName] = useState<string | null>(null);
    const [hovered, setHovered] = useState(false);

    // Estado Lógico
    const [mode, setMode] = useState<'rollo' | 'kilo'>('rollo'); 
    const [quantity, setQuantity] = useState(1);

    // Datos del Producto
    const priceUnit = mode === 'rollo' ? product.prices?.mayoreo : product.prices?.menudeo;
    const unitWeight = mode === 'rollo' ? 25 : 1; 
    
    // Cálculos Dinámicos
    const currentWeight = quantity * unitWeight;
    const currentPrice = priceUnit;
    const totalPay = currentWeight * currentPrice;
    const totalMeters = (currentWeight * (product.rendimiento || 4.3)).toFixed(1);

    const handleColorClick = (e: any, color: any) => {
        e.preventDefault();
        e.stopPropagation();
        if (color.image) setActiveImage(color.image);
        setSelectedColorName(color.name);
    };

    return (
        <div 
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`min-w-[320px] w-[320px] bg-[#050505] border border-white/10 hover:border-[#FDCB02]/50 transition-all duration-300 relative flex flex-col snap-center md:snap-align-none group overflow-hidden rounded-xl shadow-2xl ${className}`}
        >
            {/* --- IMAGEN Y HEADER --- */}
            <Link href={`/products/${product.id}`} className="block relative aspect-[4/3] w-full overflow-hidden border-b border-white/5 cursor-pointer">
                <Image 
                    src={activeImage} 
                    alt={product.title} 
                    fill 
                    className={`object-cover transition-transform duration-700 ${hovered ? 'scale-110' : 'scale-100'}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90"/>
                <div className="absolute bottom-0 left-0 w-full p-5">
                    <h3 className="text-2xl font-[1000] uppercase text-white leading-none tracking-tight mb-1">
                        {product.title}
                    </h3>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-[#FDCB02] tracking-widest uppercase">
                            {product.composicion || "100% Poliéster"}
                        </span>
                        <div className="flex flex-col items-end leading-none">
                            <span className="text-[9px] text-neutral-400 font-bold uppercase">GSM</span>
                            <span className="text-lg font-black text-white">{product.gramaje || "145"}</span>
                        </div>
                    </div>
                </div>
            </Link>

            {/* --- CUERPO DE LA TARJETA --- */}
            <div className="p-5 flex flex-col gap-5 bg-[#050505]">
                
                {/* 1. Selector de Modo */}
                <div className="grid grid-cols-2 bg-[#111] p-1 rounded-lg border border-white/10">
                    <button 
                        onClick={() => { setMode('rollo'); setQuantity(1); }}
                        className={`text-[10px] font-[900] uppercase py-2 rounded transition-all ${mode === 'rollo' ? 'bg-[#FDCB02] text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                    >
                        Por Rollo
                    </button>
                    <button 
                        onClick={() => { setMode('kilo'); setQuantity(1); }}
                        className={`text-[10px] font-[900] uppercase py-2 rounded transition-all ${mode === 'kilo' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                    >
                        Por Kilo
                    </button>
                </div>

                {/* 2. Precio y Métricas */}
                <div className="flex justify-between items-end border-b border-white/5 pb-4">
                    <div>
                        <p className="text-[9px] font-bold text-neutral-500 uppercase mb-0.5">Precio Sin Iva</p>
                        <p className="text-4xl font-[1000] text-white tracking-tighter">
                            ${priceUnit.toFixed(0)}<span className="text-sm text-neutral-500 font-bold align-top">.00</span>
                        </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5 text-[#FDCB02]">
                            <Weight size={14} strokeWidth={2.5}/>
                            <span className="text-sm font-[900]">{currentWeight} KG</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-400">
                            <Ruler size={12}/>
                            <span className="text-[10px] font-mono font-bold">{totalMeters} MT</span>
                        </div>
                    </div>
                </div>

                {/* 3. Selector de Color */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Colorido</span>
                        <span className="text-[9px] font-bold text-[#FDCB02] uppercase tracking-widest">{selectedColorName || "Seleccionar"}</span>
                    </div>
                    {product.colors && (
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                            {product.colors.slice(0, 6).map((c: any, i: number) => (
                                <button
                                    key={i}
                                    onClick={(e) => handleColorClick(e, c)}
                                    className={`w-8 h-8 rounded-full border shrink-0 transition-all relative group/color ${selectedColorName === c.name ? 'border-white ring-2 ring-[#FDCB02] ring-offset-2 ring-offset-black scale-110' : 'border-white/10 hover:border-white'}`}
                                    style={{ backgroundColor: c.hex }}
                                    title={c.name}
                                >
                                    {selectedColorName === c.name && <Check size={12} className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${c.name === 'Blanco' || c.name === 'Beige' ? 'text-black' : 'text-white'}`}/>}
                                </button>
                            ))}
                            {product.colors.length > 6 && (
                                <div className="w-8 h-8 rounded-full bg-[#111] border border-white/10 flex items-center justify-center text-[9px] font-bold text-white">
                                    +{product.colors.length - 6}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 4. Controles Finales */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between bg-[#111] border border-white/10 h-10 rounded px-1">
                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-full flex items-center justify-center text-white hover:text-[#FDCB02] transition-colors"><Minus size={14}/></button>
                        <span className="text-xs font-bold text-white uppercase">{quantity} {mode === 'rollo' ? 'Rollos' : 'Kilos'}</span>
                        <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-full flex items-center justify-center text-white hover:text-[#FDCB02] transition-colors"><Plus size={14}/></button>
                    </div>

                    <button 
                        onClick={() => addItem({ 
                            ...product, 
                            price: priceUnit, 
                            quantity: currentWeight, 
                            unit: mode === 'rollo' ? 'Kg (Rollo)' : 'Kg', 
                            variantId: mode, 
                            color: selectedColorName 
                        })} 
                        className="w-full h-12 bg-white hover:bg-[#FDCB02] text-black font-[900] uppercase tracking-widest text-xs flex items-center justify-between px-6 rounded transition-all duration-300 group/btn"
                    >
                        <span>Agregar • {formatMoney(totalPay)}</span>
                        <ArrowRight size={16} className="group-hover/btn:-rotate-45 transition-transform duration-300"/>
                    </button>
                </div>

            </div>
        </div>
    );
};

// 2. PRODUCT RAIL (INTACTO)
const ProductRail = ({ title, items, icon: Icon, isNational = false }: { title: string, items: any[], icon?: any, isNational?: boolean }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Función de Scroll Manual
    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const cardWidth = 320 + 24; // Ancho de tarjeta + Gap
            const amount = direction === 'left' ? -cardWidth : cardWidth;
            scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };

    if (!items || items.length === 0) return null;

    return (
        <section className="mb-20 border-b border-white/5 pb-10 relative group/rail">
            <div className="flex items-end justify-between mb-8 px-1">
                <div className="flex items-center gap-4">
                    {Icon && (
                        <div className={`p-3 rounded border ${isNational ? 'bg-green-900/20 border-green-500/30 text-green-500' : 'bg-[#FDCB02]/10 border-[#FDCB02]/30 text-[#FDCB02]'}`}>
                            <Icon size={24} strokeWidth={1.5}/>
                        </div>
                    )}
                    <div>
                        <h3 className="text-3xl md:text-5xl font-[1000] uppercase text-white italic tracking-tighter leading-none">{title}</h3>
                        {isNational && <p className="text-xs text-green-500/80 font-mono mt-2 uppercase tracking-widest flex items-center gap-2"><Flag size={10}/> Apoya la industria local • Envío Inmediato</p>}
                    </div>
                </div>
            </div>
            
            {/* Contenedor Relativo para posicionar flechas */}
            <div className="relative group/track">
                
                {/* Flecha Izquierda (Visible en Hover) */}
                <button 
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-12 h-20 bg-black/80 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-[#FDCB02] hover:text-black transition-all opacity-0 group-hover/track:opacity-100 rounded-r-lg shadow-xl"
                >
                    <ChevronLeft size={24} strokeWidth={3}/>
                </button>

                {/* Flecha Derecha (Visible en Hover) */}
                <button 
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-12 h-20 bg-black/80 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-[#FDCB02] hover:text-black transition-all opacity-0 group-hover/track:opacity-100 rounded-l-lg shadow-xl"
                >
                    <ChevronRight size={24} strokeWidth={3}/>
                </button>

                {/* Scroll Container (Sin onMouseMove) */}
                <div 
                    ref={scrollRef} 
                    className="flex overflow-x-auto gap-6 pb-12 scrollbar-hide -mx-6 px-6 snap-x snap-mandatory py-4"
                >
                    {items.map((product, i) => <ProductCard key={product.id || i} product={product} />)}
                    <div className="min-w-[20px] md:hidden"></div>
                </div>
            </div>
        </section>
    );
};

export default function CoyoteMarketplace() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    
    useEffect(() => {
        const lenis = new Lenis({ duration: 1.2, lerp: 0.1 });
        function raf(time: any) { lenis.raf(time); requestAnimationFrame(raf); }
        requestAnimationFrame(raf);
        return () => lenis.destroy();
    }, []);

    const toggleFilter = (item: string) => {
        setSelectedFilters(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    };

    const bestSellers = useMemo(() => products.slice(0, 8), []); 
    const sportProducts = useMemo(() => products.filter((p: any) => 
        p.title.includes('Dry') || p.title.includes('Sport') || p.id.includes('micropique')
    ), []);
    const nationalProducts = useMemo(() => products.filter((p: any) => 
        p.title.includes('Nacional') || p.id.includes('apolo')
    ), []);
    
    const FilterContent = () => (
        <>
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                <h3 className="font-[900] uppercase text-xs flex items-center gap-2 text-white"><SlidersHorizontal size={14} className="text-[#FDCB02]"/> Especificaciones</h3>
                {selectedFilters.length > 0 && <button onClick={() => setSelectedFilters([])} className="text-[9px] text-[#FDCB02] font-black uppercase">Limpiar</button>}
            </div>

            <div className="mb-12">
                <h4 className="text-[10px] font-black uppercase text-neutral-500 mb-4 tracking-widest flex items-center gap-2"><Palette size={12}/> Gama Cromática</h4>
                <div className="grid grid-cols-5 gap-2">
                    {Object.entries(COLOR_MAP).map(([name, hex]) => (
                        <div 
                            key={name} 
                            onClick={() => toggleFilter(name)}
                            title={name}
                            className={`w-10 h-10 rounded border cursor-pointer relative flex items-center justify-center transition-all ${selectedFilters.includes(name) ? 'border-[#FDCB02] scale-110 ring-1 ring-[#FDCB02]' : 'border-white/10 hover:border-white'}`}
                            style={{ backgroundColor: hex }}
                        >
                            {selectedFilters.includes(name) && <Check size={14} className={name === 'Blanco' || name === 'Beige' ? 'text-black' : 'text-white'} strokeWidth={4}/>}
                        </div>
                    ))}
                </div>
            </div>

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
        </>
    );

    return (
        <div className="bg-[#030303] min-h-screen text-white font-sans selection:bg-[#FDCB02] selection:text-black pb-20 relative overflow-x-hidden">
            
            <div className="fixed inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

            {/* HERO SECTION */}
            <div className="relative h-[80vh] md:h-[85vh] flex items-center bg-[#050505] border-b border-white/10 overflow-hidden">
                <Image src="/hero1.png" alt="Coyote Industrial" fill className="object-cover opacity-60" priority />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 md:via-black/70 to-transparent z-10"/>
                <div className="container mx-auto px-4 md:px-6 relative z-20 pt-16 md:pt-20">
                    <div className="inline-flex items-center gap-3 border-l-4 border-[#FDCB02] pl-4 md:pl-6 mb-6 md:mb-8 uppercase text-[10px] md:text-xs font-[900] tracking-[0.3em] text-[#FDCB02]">Infraestructura Nacional</div>
                    <div className="flex flex-col mb-8 md:mb-10 leading-[0.85]">
                        <h1 className="text-5xl sm:text-6xl md:text-[8vw] font-[1000] uppercase text-white tracking-tighter drop-shadow-2xl">
                            VISTIENDO LA FUERZA
                        </h1>
                        <h1 className="text-5xl sm:text-6xl md:text-[9vw] font-[1000] uppercase text-[#FDCB02] tracking-tighter drop-shadow-2xl">
                            DE MÉXICO
                        </h1>
                    </div>
                    <p className="text-lg md:text-3xl text-white font-[900] max-w-xl md:max-w-3xl mb-8 md:mb-12 uppercase italic tracking-tight opacity-90">
                        Control absoluto del suministro. Sin rivales. Sin excusas.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                        <Link href="/contenedor" className="bg-[#FDCB02] text-black h-14 md:h-16 px-12 flex items-center justify-center font-[900] uppercase text-xs md:text-sm tracking-widest rounded hover:bg-white transition-colors">Cotizar Contenedor</Link>
                        <button className="h-14 md:h-16 px-12 border border-white/20 bg-black/50 backdrop-blur text-white flex items-center justify-center font-[900] uppercase text-xs md:text-sm tracking-widest rounded hover:bg-white hover:text-black transition-colors">
                             Ver Stock
                        </button>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 md:px-6 py-10 md:py-16 flex flex-col lg:flex-row gap-12 items-start relative z-10">
                
                {/* BOTÓN FILTRO MÓVIL */}
                <div className="lg:hidden w-full sticky top-20 z-30 mb-4">
                    <button 
                        onClick={() => setIsFilterOpen(true)}
                        className="w-full bg-[#111]/90 backdrop-blur border border-white/10 text-white py-3 px-4 flex justify-between items-center rounded shadow-xl"
                    >
                        <span className="flex items-center gap-2 font-[900] uppercase text-xs"><Filter size={14} className="text-[#FDCB02]"/> Filtrar Productos</span>
                        <span className="bg-[#FDCB02] text-black text-[10px] font-bold px-2 py-0.5 rounded-full">{selectedFilters.length}</span>
                    </button>
                </div>

                {/* DRAWER FILTROS */}
                {isFilterOpen && (
                    <div className="fixed inset-0 z-[200] lg:hidden">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsFilterOpen(false)}/>
                        <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-[#0a0a0a] border-l border-white/10 p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
                             <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-[1000] uppercase italic">Filtros</h2>
                                <button onClick={() => setIsFilterOpen(false)}><X size={24}/></button>
                            </div>
                            <FilterContent />
                            <button onClick={() => setIsFilterOpen(false)} className="w-full bg-[#FDCB02] text-black font-[900] uppercase py-4 mt-4 rounded">Ver Resultados</button>
                        </div>
                    </div>
                )}
                <div className="flex-1 w-full min-w-0">
                    <div className="space-y-24 animate-in fade-in duration-700">
                        <ProductRail title="Potencia en cada fibra" items={bestSellers} icon={BicepsFlexed}/>
                        {sportProducts.length > 0 && <ProductRail title="Textiles Deportivos" items={sportProducts} icon={Zap}/>}
                        
                        <div className="w-full h-auto py-8 md:h-40 relative rounded overflow-hidden group border border-white/10 flex flex-col md:flex-row items-start md:items-center px-6 md:px-12 bg-[#111] gap-6">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"/>
                            <div className="relative z-10 flex flex-col items-start gap-2">
                                <div className="flex items-center gap-2 text-[#FDCB02] mb-1">
                                    <Sun size={18}/> <span className="text-[11px] font-black uppercase tracking-widest">Tecnología UV-Shield</span>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-[900] uppercase text-white italic tracking-tighter">Protección Solar Certificada</h3>
                                <p className="text-xs md:text-sm text-neutral-400 font-mono mt-1">Disponible en Piqué y Microfibra para uniformes escolares.</p>
                            </div>
                            <button className="md:ml-auto w-full md:w-auto bg-white hover:bg-[#FDCB02] text-black px-8 py-3 md:py-4 text-[10px] md:text-[11px] font-[900] uppercase tracking-widest transition-colors rounded">Ver Colección</button>
                        </div>

                        {nationalProducts.length > 0 && <ProductRail title="Producción Nacional" items={nationalProducts} icon={Flag} isNational={true}/>}

                        <section className="pt-8 border-t border-white/10">
                            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-4 gap-4 uppercase">
                                <h3 className="text-3xl md:text-4xl font-[900] text-white italic tracking-tighter">Catálogo Global</h3>
                                <span className="text-xs font-mono text-neutral-500 font-bold border border-white/10 px-3 py-1 rounded bg-[#0a0a0a] w-fit">{products.length} Referencias</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                {products.map((p) => <ProductCard key={p.id} product={p} className="!w-full !min-w-0" />)}
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}