"use client"

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Anchor, Zap, Shield, Scissors, Layers, Hexagon, Droplets, ArrowRight } from "lucide-react";
import Lenis from 'lenis';

// --- DATA: EL ARSENAL TEXTIL ---
const CATEGORIES = [
  {
    id: "deportivos",
    title: "Performance",
    subtitle: "Alto Rendimiento",
    desc: "Textiles con tecnología de absorción y secado rápido para ropa deportiva de alta exigencia.",
    icon: Zap,
    sku_prefix: "PRF",
    count: "42 Lotes",
    tags: ["Dry-Fit", "Micro-Piqué", "Licra Sport"],
    img: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=1200&auto=format&fit=crop", 
    accent: "group-hover:text-[#FDCB02] group-hover:border-[#FDCB02]"
  },
  {
    id: "escolares",
    title: "Institucional",
    subtitle: "Uso Rudo / Escolar",
    desc: "Tejidos de batalla diseñados para el uso rudo diario. Solidez de color y durabilidad garantizada.",
    icon: Shield,
    sku_prefix: "INS",
    count: "28 Lotes",
    tags: ["Piqué", "Felpa", "Sportock"],
    img: "https://images.unsplash.com/photo-1506197061617-7f5c0b093236?q=80&w=1200&auto=format&fit=crop",
    accent: "group-hover:text-blue-400 group-hover:border-blue-400"
  },
  {
    id: "moda",
    title: "Moda & Trend",
    subtitle: "Fashion / Boutique",
    desc: "Colecciones de temporada con caídas suaves y texturas visuales para confección boutique.",
    icon: Scissors,
    sku_prefix: "MOD",
    count: "65 Lotes",
    tags: ["Chifón", "Brush", "Satín"],
    img: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=1200&auto=format&fit=crop",
    accent: "group-hover:text-purple-400 group-hover:border-purple-400"
  },
  {
    id: "industriales",
    title: "Heavy Duty",
    subtitle: "Industrial / Workwear",
    desc: "Gramajes pesados para uniformes operativos, seguridad industrial y mezclillas de trabajo.",
    icon: Anchor,
    sku_prefix: "IND",
    count: "15 Lotes",
    tags: ["Gabardina", "Mezclilla 14oz", "Canvas"],
    img: "https://images.unsplash.com/photo-1474314170901-f351b68f544f?q=80&w=1200&auto=format&fit=crop",
    accent: "group-hover:text-orange-500 group-hover:border-orange-500"
  },
  {
    id: "tecnicos",
    title: "Tech Labs",
    subtitle: "Membranas Técnicas",
    desc: "Fibras inteligentes con recubrimientos repelentes, antibacteriales o ignífugos.",
    icon: Hexagon,
    sku_prefix: "TEC",
    count: "08 Lotes",
    tags: ["Impermeable", "Antiestático", "Ripstop"],
    img: "https://images.unsplash.com/photo-1579621970795-87facc2f976d?q=80&w=1200&auto=format&fit=crop",
    accent: "group-hover:text-teal-400 group-hover:border-teal-400"
  },
  {
    id: "sublimacion",
    title: "Print Base",
    subtitle: "Sublimación Digital",
    desc: "Bases 100% poliéster optimizadas para transferencia de tinta digital con máxima nitidez.",
    icon: Layers,
    sku_prefix: "SUB",
    count: "30 Lotes",
    tags: ["Tacto Algodón", "Microfibra", "Jersey Poly"],
    img: "https://images.unsplash.com/photo-1596541223130-5d31a73fb6c6?q=80&w=1200&auto=format&fit=crop",
    accent: "group-hover:text-pink-500 group-hover:border-pink-500"
  }
];

export default function CategoriesPage() {
  const containerRef = useRef(null);

  // Smooth Scroll
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, lerp: 0.1 });
    function raf(time: any) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#FDCB02] selection:text-black">
      
      {/* Background Noise Industrial */}
      <div className="fixed inset-0 z-0 opacity-[0.05] pointer-events-none bg-repeat" 
           style={{ backgroundImage: `url("https://grainy-gradients.vercel.app/noise.svg")` }} />

      {/* HEADER: EL ARCHIVO */}
      <header className="relative z-10 pt-32 pb-20 px-6 border-b border-white/10 bg-[#050505]">
         <div className="container mx-auto max-w-[1800px]">
            <div className="flex flex-col md:flex-row justify-between items-end gap-10">
               <div>
                  <div className="flex items-center gap-3 mb-8 border border-white/10 w-fit px-4 py-1 rounded-full bg-white/5 backdrop-blur-sm">
                     <div className="h-2 w-2 bg-[#FDCB02] rounded-full animate-pulse shadow-[0_0_10px_#FDCB02]" />
                     <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-neutral-400">Directorio de Materias Primas</span>
                  </div>
                  <h1 className="text-6xl md:text-9xl font-[1000] uppercase tracking-tighter leading-[0.85] text-white">
                     ÍNDICE <br/> <span className="text-transparent" style={{ WebkitTextStroke: '1px #666' }}>MAESTRO</span>
                  </h1>
               </div>
               <div className="mb-2 hidden md:block">
                  <p className="font-mono text-xs max-w-xs text-right uppercase text-neutral-500 leading-relaxed">
                     <span className="text-white font-bold block mb-1">Status del Almacén:</span>
                     Inventario actualizado en tiempo real. <br/>
                     Selecciona una división para acceder.
                  </p>
               </div>
            </div>
         </div>
      </header>

      {/* GRID DE CATEGORÍAS TIPO "EXPEDIENTE" */}
      <section className="relative z-10">
         {CATEGORIES.map((cat, i) => (
            <Link key={cat.id} href={`/search?q=${cat.title}`} className="block group w-full">
               <div className="border-b border-white/10 bg-[#0a0a0a] hover:bg-[#000] transition-colors duration-500 relative overflow-hidden w-full">
                  
                  {/* Hover Reveal Image Background (Oscurecida para legibilidad) */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none z-0">
                     <Image src={cat.img} alt={cat.title} fill className="object-cover grayscale scale-105 group-hover:scale-100 transition-transform duration-[2s]" />
                     <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
                  </div>

                  <div className="container mx-auto max-w-[1800px] px-6 py-16 md:py-24 flex flex-col md:flex-row justify-between items-center gap-12 relative z-20 w-full">
                     
                     {/* Columna ID & Icono */}
                     <div className="flex items-start gap-6 md:gap-10 md:w-2/5 w-full">
                        <div className="flex flex-col items-center gap-2">
                           <span className={`font-mono text-[10px] border border-white/10 px-2 py-0.5 rounded text-neutral-600 ${cat.accent} transition-colors`}>
                              {cat.sku_prefix}
                           </span>
                           <span className="font-mono text-3xl font-black text-white/10 group-hover:text-white/30 transition-colors">
                              0{i + 1}
                           </span>
                        </div>
                        
                        <div>
                           <div className={`p-4 rounded-xl mb-6 inline-flex items-center justify-center border border-white/10 bg-white/5 ${cat.accent} transition-all duration-300 group-hover:scale-110 group-hover:bg-black/50 backdrop-blur-md`}>
                              <cat.icon size={28} strokeWidth={1.5} />
                           </div>
                           <h2 className="text-5xl md:text-7xl font-[1000] uppercase tracking-tighter italic text-white group-hover:translate-x-2 transition-transform duration-500">
                              {cat.title}
                           </h2>
                           <div className="flex items-center gap-3 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-y-2 group-hover:translate-y-0">
                              <div className="h-px w-8 bg-current opacity-50"/>
                              <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${cat.accent.split(' ')[0]}`}>
                                 {cat.count} DISPONIBLES
                              </span>
                           </div>
                        </div>
                     </div>

                     {/* Columna Descripción (Oculta en móvil para limpieza, visible en escritorio) */}
                     <div className="w-full md:w-2/5 text-left pl-0 md:pl-10 border-l-0 md:border-l border-white/5">
                        <h3 className={`text-lg font-bold uppercase tracking-widest mb-4 text-neutral-400 ${cat.accent.split(' ')[0]} transition-colors`}>
                           {cat.subtitle}
                        </h3>
                        <p className="text-sm font-medium text-neutral-500 group-hover:text-neutral-300 leading-relaxed max-w-lg transition-colors">
                           {cat.desc}
                        </p>
                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mt-8">
                           {cat.tags.map(tag => (
                              <span key={tag} className="text-[10px] font-bold font-mono border border-white/10 bg-white/5 px-3 py-1 uppercase text-neutral-400 group-hover:border-white/30 group-hover:text-white transition-all">
                                 {tag}
                              </span>
                           ))}
                        </div>
                     </div>

                     {/* Columna Acción */}
                     <div className="md:w-1/5 flex justify-end w-full mt-8 md:mt-0">
                        <div className={`w-20 h-20 rounded-full border border-white/10 flex items-center justify-center transition-all duration-500 group-hover:border-transparent relative overflow-hidden group/btn`}>
                           <div className={`absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 ${cat.accent.replace('text', 'bg').split(' ')[0].replace('group-hover:', '')}`} />
                           <ArrowRight size={28} className="text-white relative z-10 -rotate-45 group-hover:rotate-0 transition-transform duration-500" />
                        </div>
                     </div>

                  </div>
               </div>
            </Link>
         ))}
      </section>

      {/* FOOTER DE LA SECCIÓN */}
      <div className="bg-black text-neutral-600 py-20 px-6 text-center border-t border-white/10">
         <div className="inline-flex flex-col items-center gap-4">
            <Anchor size={24} className="opacity-50"/>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-50">
               Fin del Directorio • Coyote Textil MX
            </p>
         </div>
      </div>

    </div>
  );
}