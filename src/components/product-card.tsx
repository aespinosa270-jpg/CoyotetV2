"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react" // 🔥 REACCIÓN EN TIEMPO REAL
import { useCart } from "@/lib/context/cart-context"
import { 
  Check, ArrowRight, Ruler, Weight, Info, Plus, Minus, Star, Truck
} from "lucide-react"

interface ProductProps {
  product: any
  className?: string
}

const formatMoney = (amount: number) => 
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(amount);

export default function ProductCard({ product, className = "" }: ProductProps) {
    const { data: session } = useSession(); // 🔥 OBTENEMOS EL ADN DEL SOCIO
    const { addItem } = useCart();
    
    // 1. IDENTIFICACIÓN DE MEMBRESÍA REAL
    const tier = session?.user?.membershipTier || "NONE";
    const isGold = tier === "GOLD";
    const isBlack = tier === "BLACK";
    const isElite = tier === "ELITE";
    const hasDiscount = isGold || isBlack || isElite;

    // 2. MOTOR DE DESCUENTOS (COHERENTE CON LOS PLANES)
    // GOLD: 10% | BLACK/ELITE: 15%
    const discountMultiplier = isElite || isBlack ? 0.85 : isGold ? 0.90 : 1;
    const discountPercent = isElite || isBlack ? 15 : isGold ? 10 : 0;

    const [activeImage, setActiveImage] = useState(product.thumbnail);
    const [selectedColorName, setSelectedColorName] = useState<string | null>(product.colors?.[0]?.name || null);
    const [hovered, setHovered] = useState(false);
    const [mode, setMode] = useState<'rollo' | 'kilo'>('rollo'); 
    const [quantity, setQuantity] = useState(1);

    // 3. CÁLCULO FINANCIERO DINÁMICO
    const basePrice = mode === 'rollo' ? product.prices?.mayoreo : product.prices?.menudeo;
    const finalPrice = basePrice * discountMultiplier; // 🔥 PRECIO YA REBAJADO

    const isMeter = product.unit === 'Metro';
    const unitLabel = isMeter ? 'Metro' : 'Kilo';
    const unitAbbr = isMeter ? 'm' : 'Kg';
    const unitsPerRoll = product.unidadesPorRollo || 25;

    const unitWeight = mode === 'rollo' ? unitsPerRoll : 1; 
    const currentWeight = quantity * unitWeight;
    const totalPay = currentWeight * finalPrice;
    
    const totalMeters = !isMeter ? (currentWeight * (product.rendimiento || 4.3)).toFixed(1) : currentWeight;

    const handleColorClick = (e: any, color: any) => {
        e.preventDefault(); 
        e.stopPropagation();
        if (color.image) setActiveImage(color.image);
        setSelectedColorName(color.name);
    };

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        addItem({ 
            id: `${product.id}-${mode}-${selectedColorName || 'default'}`, 
            productId: product.id,
            title: product.title,
            price: finalPrice, 
            image: activeImage,
            quantity: currentWeight,
            unit: mode === 'rollo' ? `${unitAbbr} (Rollo)` : unitAbbr, 
            meta: {
                mode: mode,
                color: selectedColorName || undefined, 
                packages: quantity,
                meters: totalMeters,
                tierApplied: tier // Guardamos qué tier le dio el precio
            }
        });
    };

    return (
        <div 
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`min-w-[320px] w-full bg-[#050505] border border-white/10 hover:border-[#FDCB02]/50 transition-all duration-300 relative flex flex-col group overflow-hidden rounded-xl shadow-2xl ${className}`}
        >
            <Link href={`/products/${product.id}`} className="block relative aspect-[4/3] w-full overflow-hidden border-b border-white/5 cursor-pointer">
                <Image 
                    src={activeImage} alt={product.title} fill 
                    className={`object-cover transition-transform duration-700 ${hovered ? 'scale-110' : 'scale-100'}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90"/>
                
                {/* 🔥 BADGE DE MEMBRESÍA DINÁMICO */}
                {hasDiscount && (
                    <div className={`absolute top-3 right-3 text-[9px] font-[1000] px-2 py-1 rounded uppercase shadow-lg z-10 flex items-center gap-1 animate-in zoom-in duration-500
                        ${isBlack ? 'bg-white text-black' : isElite ? 'bg-[#FDCB02] text-black ring-2 ring-[#FDCB02] ring-offset-2 ring-offset-black' : 'bg-[#FDCB02] text-black'}
                    `}>
                        <Star size={10} fill="currentColor" /> Socio {tier} -{discountPercent}%
                    </div>
                )}

                {/* 🔥 PRIVILEGIO ELITE: ENVÍO GRATIS */}
                {isElite && (
                    <div className="absolute top-3 left-3 bg-green-500 text-white text-[8px] font-black px-2 py-1 rounded uppercase flex items-center gap-1 shadow-lg">
                        <Truck size={10} /> Envío Local Gratis
                    </div>
                )}

                <div className="absolute bottom-0 left-0 w-full p-5">
                    <h3 className="text-2xl font-[1000] uppercase text-white leading-none tracking-tight mb-1">{product.title}</h3>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-[#FDCB02] tracking-widest uppercase">{product.composicion || "100% Poliéster"}</span>
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
                        Muestra
                    </button>
                </div>

                <div className="flex justify-between items-end border-b border-white/5 pb-4">
                    <div>
                        <p className="text-[9px] font-bold text-neutral-500 uppercase mb-0.5 flex items-center gap-1">
                            Precio {tier !== 'NONE' ? `Socio ${tier}` : 'General'} 
                            {hasDiscount && <Info size={10} className="text-[#FDCB02]"/>}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <p className={`text-4xl font-[1000] tracking-tighter ${hasDiscount ? 'text-[#FDCB02]' : 'text-white'}`}>
                                ${finalPrice.toFixed(0)}<span className={`text-sm font-bold align-top ${hasDiscount ? 'text-yellow-600' : 'text-neutral-500'}`}>.00</span>
                            </p>
                            
                            {/* 🔥 PRECIO ORIGINAL TACHADO */}
                            {hasDiscount && (
                                <span className="text-xs text-neutral-600 line-through font-bold">
                                    ${basePrice.toFixed(0)}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5 text-[#FDCB02]">
                            {isMeter ? <Ruler size={14} strokeWidth={2.5}/> : <Weight size={14} strokeWidth={2.5}/>}
                            <span className="text-sm font-[900]">{currentWeight} {unitAbbr.toUpperCase()}</span>
                        </div>
                        {!isMeter && (
                            <div className="flex items-center gap-1.5 text-neutral-400">
                                <Ruler size={12}/>
                                <span className="text-[10px] font-mono font-bold">{totalMeters} MT</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* SELECTOR DE COLOR */}
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
                        onClick={handleAddToCart}
                        className={`w-full h-12 font-[900] uppercase tracking-widest text-xs flex items-center justify-between px-6 rounded transition-all duration-300 group/btn
                            ${hasDiscount ? 'bg-[#FDCB02] text-black hover:bg-white' : 'bg-white text-black hover:bg-[#FDCB02]'}
                        `}
                    >
                        <span>Agregar • {formatMoney(totalPay)}</span>
                        <ArrowRight size={16} className="group-hover/btn:-rotate-45 transition-transform duration-300"/>
                    </button>
                </div>
            </div>
        </div>
    );
}