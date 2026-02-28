"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation"; 
import { motion, AnimatePresence } from "framer-motion"; 
import { products } from "@/lib/products"; 
import { useCart } from "@/lib/context/cart-context"; 
import { useSession } from "next-auth/react"; 
import { 
  Plus, Minus, Check, ArrowRight, 
  Flag, 
  Zap, Star,
  Ruler, Sun, Weight,
  BicepsFlexed, Package
} from "lucide-react";
import Image from "next/image";
import Lenis from 'lenis';

// --- COMPONENTE: INTRO LOADER ---
function IntroLoader() {
  const [isVisible, setIsVisible] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const isHome = pathname === "/";
    
    if (!isHome) {
      setIsVisible(false);
      document.body.style.overflow = "auto";
      return;
    }

    setIsVisible(true);
    document.body.style.overflow = "hidden";

    const safetyTimer = setTimeout(() => {
      handleVideoComplete();
    }, 6000); 

    return () => clearTimeout(safetyTimer);
  }, [pathname]);

  const handleVideoComplete = () => {
    setIsVisible(false);
    document.body.style.overflow = "auto";
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          <div className="absolute inset-0 bg-black -z-10" />
          <video
            src="/i-coyote.mp4" 
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            onEnded={handleVideoComplete}
            onError={(e) => {
              console.error("Error al cargar el video intro", e);
              handleVideoComplete(); 
            }}
          />
          <button 
            onClick={handleVideoComplete}
            className="absolute bottom-12 right-8 text-[10px] font-black text-white/40 hover:text-white uppercase tracking-[0.2em] border border-white/10 hover:border-white px-5 py-2 rounded-full transition-all z-50 backdrop-blur-sm"
          >
            Saltar
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- UTILIDADES ---
const formatMoney = (amount: number) => 
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(amount);

// --- COMPONENTES UI ---

// 1. PRODUCT CARD PREMIUM
const ProductCard = ({ product, className = "" }: { product: any, className?: string }) => {
  const { addItem } = useCart();
  const { data: session } = useSession();
  const tier = session?.user?.membershipTier ?? "NONE";
  const isGold = tier === "GOLD";
  const isBlack = tier === "BLACK";
  const isElite = tier === "ELITE";
  const hasDiscount = isGold || isBlack || isElite;
  const discountMultiplier = isBlack || isElite ? 0.85 : isGold ? 0.9 : 1;
  const discountPercent = isBlack || isElite ? 15 : isGold ? 10 : 0;
  
  const [activeImage, setActiveImage] = useState(product.thumbnail);
  const [selectedColorName, setSelectedColorName] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const [mode, setMode] = useState<'rollo' | 'kilo'>('rollo'); 
  const [quantity, setQuantity] = useState(1);

  const isMeter = product.unit === 'Metro';
  const unitLabel = isMeter ? 'Metro' : 'Kilo';
  const unitAbbr = isMeter ? 'MT' : 'KG';
  const unitsPerRoll = product.unidadesPorRollo || 25;

  const basePrice = mode === 'rollo' ? product.prices?.mayoreo : product.prices?.menudeo;
  const currentPrice = basePrice * discountMultiplier;
  const unitFactor = mode === 'rollo' ? unitsPerRoll : 1; 
  const currentUnits = quantity * unitFactor;
  const totalPay = currentUnits * currentPrice;
  const totalMeters = !isMeter ? (currentUnits * (product.rendimiento || 4.3)).toFixed(1) : currentUnits;

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
      // 🐺 INYECCIÓN: shrink-0 añadido para evitar que las tarjetas se aplasten en el carrusel
      className={`shrink-0 min-w-[320px] w-[320px] bg-[#050505] border border-white/10 hover:border-[#FDCB02]/50 transition-all duration-300 relative flex flex-col snap-center group overflow-hidden rounded-xl shadow-2xl ${className}`}
    >
      {hasDiscount && (
        <div className="absolute top-4 right-4 z-20 bg-[#FDCB02] text-black text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded shadow-lg flex items-center gap-1">
          <Star size={10} fill="currentColor" /> TARIFA {tier}
        </div>
      )}

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

      <div className="p-5 flex flex-col gap-5 bg-[#050505]">
        <div className="grid grid-cols-2 bg-[#111] p-1 rounded-lg border border-white/10">
          <button 
            onClick={(e) => { e.preventDefault(); setMode('rollo'); setQuantity(1); }}
            className={`text-[10px] font-[900] uppercase py-2 rounded transition-all ${mode === 'rollo' ? 'bg-[#FDCB02] text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
          >
            Por Rollo
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); setMode('kilo'); setQuantity(1); }}
            className={`text-[10px] font-[900] uppercase py-2 rounded transition-all ${mode === 'kilo' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
          >
            Por {unitLabel}
          </button>
        </div>

        <div className="flex justify-between items-end border-b border-white/5 pb-4">
          <div>
            <p className="text-[9px] font-bold text-neutral-500 uppercase mb-0.5">
              Precio Sin Iva {hasDiscount ? <span className="text-[#FDCB02]">(-{discountPercent}%)</span> : ''}
            </p>
            {hasDiscount && (
              <p className="text-[11px] text-neutral-500 line-through font-bold mb-0.5 leading-none">
                ${basePrice.toFixed(2)}
              </p>
            )}
            <p className={`text-4xl font-[1000] tracking-tighter ${hasDiscount ? 'text-[#FDCB02] drop-shadow-[0_0_10px_rgba(253,203,2,0.3)]' : 'text-white'}`}>
              ${currentPrice.toFixed(0)}<span className={`text-sm font-bold align-top ${hasDiscount ? 'text-yellow-600' : 'text-neutral-500'}`}>.00</span>
            </p>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 text-[#FDCB02]">
              {isMeter ? <Ruler size={14} strokeWidth={2.5}/> : <Weight size={14} strokeWidth={2.5}/>}
              <span className="text-sm font-[900]">{currentUnits} {unitAbbr}</span>
            </div>
            {!isMeter && (
              <div className="flex items-center gap-1.5 text-neutral-400">
                <Ruler size={12}/>
                <span className="text-[10px] font-mono font-bold">{totalMeters} MT</span>
              </div>
            )}
          </div>
        </div>

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

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between bg-[#111] border border-white/10 h-10 rounded px-1">
            <button onClick={(e) => { e.preventDefault(); setQuantity(Math.max(1, quantity - 1)); }} className="w-8 h-full flex items-center justify-center text-white hover:text-[#FDCB02] transition-colors"><Minus size={14}/></button>
            <span className="text-xs font-bold text-white uppercase">{quantity} {mode === 'rollo' ? 'Rollos' : `${unitLabel}s`}</span>
            <button onClick={(e) => { e.preventDefault(); setQuantity(quantity + 1); }} className="w-8 h-full flex items-center justify-center text-white hover:text-[#FDCB02] transition-colors"><Plus size={14}/></button>
          </div>

          <button 
            onClick={(e) => {
              e.preventDefault();
              addItem({ 
                ...product, 
                price: currentPrice, 
                quantity: currentUnits, 
                unit: mode === 'rollo' ? `${unitLabel} (Rollo)` : unitLabel, 
                variantId: mode, 
                color: selectedColorName 
              });
            }} 
            className={`w-full h-12 font-[900] uppercase tracking-widest text-xs flex items-center justify-between px-6 rounded transition-all duration-300 group/btn ${hasDiscount ? 'bg-[#FDCB02] text-black hover:bg-white' : 'bg-white hover:bg-[#FDCB02] text-black'}`}
          >
            <span>Agregar • {formatMoney(totalPay)}</span>
            <ArrowRight size={16} className="group-hover/btn:-rotate-45 transition-transform duration-300"/>
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. PRODUCT RAIL (AHORA SOPORTA CARRUSEL INFINITO)
const ProductRail = ({ id, title, items, icon: Icon, isNational = false, titleAlign = 'left', isCarousel = false }: { id: string, title: string, items: any[], icon?: any, isNational?: boolean, titleAlign?: 'left' | 'right', isCarousel?: boolean }) => {
  // Si es carrusel muestra TODOS, si no, limita a 4
  const displayItems = isCarousel ? items : items.slice(0, 4);

  if (!displayItems || displayItems.length === 0) return null;

  const isRight = titleAlign === 'right';

  return (
    <section id={id} className="mb-20 border-b border-white/5 pb-10 scroll-mt-[150px]">
      <div className={`flex items-end mb-8 px-1 ${isRight ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex items-center gap-4 ${isRight ? 'flex-row-reverse' : ''}`}>
          {Icon && (
            <div className={`p-3 rounded border ${isNational ? 'bg-green-900/20 border-green-500/30 text-green-500' : 'bg-[#FDCB02]/10 border-[#FDCB02]/30 text-[#FDCB02]'}`}>
              <Icon size={24} strokeWidth={1.5}/>
            </div>
          )}
          <div className={isRight ? 'text-right' : ''}>
            <h3 className="text-3xl md:text-5xl font-[1000] uppercase text-white italic tracking-tighter leading-none">{title}</h3>
            {isNational && <p className={`text-xs text-green-500/80 font-mono mt-2 uppercase tracking-widest flex items-center gap-2 ${isRight ? 'justify-end' : ''}`}><Flag size={10}/> Apoya la industria local • Envío Inmediato</p>}
          </div>
        </div>
      </div>

      {/* 🐺 INYECCIÓN: Lógica dinámica de contenedor Flex-Wrap vs Carrusel nativo con Snap */}
      <div className={
        isCarousel 
          ? "flex overflow-x-auto gap-6 pb-8 pt-4 snap-x snap-mandatory items-stretch [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" 
          : "flex flex-wrap justify-center gap-6 py-4"
      }>
        {displayItems.map((product, i) => <ProductCard key={product.id || i} product={product} />)}
      </div>
    </section>
  );
};

export default function CoyoteMarketplace() {
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, lerp: 0.1 });
    function raf(time: any) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  const categories = [
    { id: "telas-para-sublimar", title: "Telas para Sublimar", items: products.filter((p: any) => p.title.toLowerCase().includes('sublimar') || p.title.toLowerCase().includes('poliester')), icon: Package },
    { id: "telas-escolares", title: "Telas Escolares", items: products.filter((p: any) => p.title.toLowerCase().includes('escolar') || p.title.toLowerCase().includes('pique') || p.title.toLowerCase().includes('deportivo')), icon: Package },
    { id: "licras", title: "Licras", items: products.filter((p: any) => p.title.toLowerCase().includes('licra') || p.title.toLowerCase().includes('spandex')), icon: Package },
    { id: "telas-nacionales", title: "Telas Nacionales", items: products.filter((p: any) => p.title.toLowerCase().includes('nacional') || p.id.includes('apolo')), icon: Flag, isNational: true },
    { id: "telas-para-decoracion", title: "Telas para Decoración", items: products.filter((p: any) => p.title.toLowerCase().includes('decoracion') || p.title.toLowerCase().includes('tapiceria')), icon: Package },
    { id: "telas-invierno", title: "Telas Invierno", items: products.filter((p: any) => p.title.toLowerCase().includes('invierno') || p.title.toLowerCase().includes('polar') || p.title.toLowerCase().includes('felpa')), icon: Package },
    { id: "telas-de-temporada", title: "Telas de Temporada", items: products.filter((p: any) => p.title.toLowerCase().includes('temporada') || p.title.toLowerCase().includes('terry')), icon: Package },
    { id: "forros", title: "Forros", items: products.filter((p: any) => p.title.toLowerCase().includes('forro') || p.title.toLowerCase().includes('tafeta') || p.title.toLowerCase().includes('cartera')), icon: Package },
    { id: "gabardinas", title: "Gabardinas", items: products.filter((p: any) => p.title.toLowerCase().includes('gabardina')), icon: Package },
    { id: "mezclilla", title: "Mezclilla", items: products.filter((p: any) => p.title.toLowerCase().includes('mezclilla') || p.title.toLowerCase().includes('denim')), icon: Package },
    { id: "telas-para-campana", title: "Telas para Campaña", items: products.filter((p: any) => p.title.toLowerCase().includes('campaña') || p.title.toLowerCase().includes('bandera') || p.title.toLowerCase().includes('tafeta')), icon: Package },
    { id: "telas-para-maratones", title: "Telas para Maratones", items: products.filter((p: any) => p.title.toLowerCase().includes('maraton') || p.title.toLowerCase().includes('mesh') || p.title.toLowerCase().includes('dry')), icon: Zap },
    { id: "repelentes", title: "Repelentes", items: products.filter((p: any) => p.title.toLowerCase().includes('repelente') || p.title.toLowerCase().includes('impermeable')), icon: Package }
  ];

  return (
    <div className="bg-[#030303] min-h-screen text-white font-sans selection:bg-[#FDCB02] selection:text-black pb-20 relative overflow-x-hidden">
      
      <IntroLoader />

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

      <main className="container mx-auto px-4 md:px-6 py-10 md:py-16 relative z-10">
        <div className="space-y-24 animate-in fade-in duration-700">
          
          {/* 🐺 INYECCIÓN: El Carrusel Deportivo
              Aquí llamamos a TODAS las telas de la categoría y activamos isCarousel={true}
          */}
          <ProductRail
            id="telas-deportivas"
            title="Potencia en cada fibra"
            items={products.filter((p: any) => p.category?.includes('Deportiva') || p.category?.includes('Licra'))} 
            icon={BicepsFlexed}
            titleAlign="left"
            isCarousel={true}
          />

          {/* Resto de categorías — título a la derecha */}
          {categories.map((cat) => (
            <ProductRail
              key={cat.id}
              id={cat.id}
              title={cat.title}
              items={cat.items}
              icon={cat.icon}
              isNational={cat.isNational}
              titleAlign="right"
              // Las demás categorías se quedan normal limitadas a 4
            />
          ))}

          {/* BANNER UV */}
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

          {/* CATÁLOGO GLOBAL */}
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
      </main>
    </div>
  );
}