'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Activity, Target, 
  ChevronRight, ChevronLeft, Fingerprint, Shield, Zap, QrCode
} from 'lucide-react';

// --- UTILIDAD DE FORMATO DE MONEDA ---
const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// --- CONFIGURACIÓN DE NIVELES (4 CARDS) ---
const PLANS = [
  {
    id: 0, key: 'BASE', name: 'Acceso Inicial', price: 0, 
    bgClass: 'bg-gradient-to-br from-[#e3e3e3] via-[#c4c4c4] to-[#8a8a8a]',
    glowColor: 'rgba(255,255,255,0.3)',
    textColor: 'text-neutral-900',
    borderColor: 'border-white/60',
    features: [
        '0.5 Puntos por cada $100 MXN',
        'Acceso a Catálogo Global',
        'Sin acceso a apartados'
    ],
    tag: 'STANDARD MEMBER'
  },
  {
    id: 1, key: 'GOLD', name: 'Socio Comercial', price: 499, 
    bgClass: 'bg-gradient-to-br from-[#FFD700] via-[#FDCB02] to-[#B8860B]',
    glowColor: 'rgba(253, 203, 2, 0.6)',
    textColor: 'text-black',
    borderColor: 'border-yellow-200/50',
    recommended: true,
    features: [
        '7 Días de Apartado',
        '3 Colocaciones s/costo',
        '1 Punto por cada $100 MXN'
    ],
    tag: 'PRIORITY MEMBER'
  },
  {
    id: 2, key: 'BLACK', name: 'Socio Ejecutivo', price: 799, 
    bgClass: 'bg-gradient-to-br from-[#333] via-[#1a1a1a] to-[#000]',
    glowColor: 'rgba(255,255,255,0.2)',
    textColor: 'text-white',
    borderColor: 'border-white/20',
    features: [
        '7 Días de Apartado',
        '6 Colocaciones s/costo',
        '2 Puntos por cada $100 MXN',
        'Prioridad en Paquetería',
        'Muestrarios Gratis'
    ],
    tag: 'EXECUTIVE ACCESS'
  },
  {
    id: 3, key: 'ELITE', name: 'Master Partner', price: 1129, 
    bgClass: 'bg-gradient-to-br from-[#2b3a42] via-[#1c252b] to-[#0b0e11]',
    glowColor: 'rgba(100, 200, 255, 0.3)',
    textColor: 'text-white',
    borderColor: 'border-cyan-900/30',
    features: [
        '15 Días de Apartado',
        '10 Colocaciones s/costo',
        '4 Puntos por cada $100 MXN',
        'Acceso 30 días antes a Novedades',
        'Prioridad Total en Despacho',
        'Muestrarios & Regalos Textiles'
    ],
    tag: 'ELITE PARTNER'
  }
];

export default function MembershipStack() {
  const [activeIndex, setActiveIndex] = useState(1); // Inicia en GOLD
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const nextPlan = useCallback(() => setActiveIndex((prev) => (prev + 1) % PLANS.length), []);
  const prevPlan = useCallback(() => setActiveIndex((prev) => (prev - 1 + PLANS.length) % PLANS.length), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextPlan();
      if (e.key === 'ArrowLeft') prevPlan();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextPlan, prevPlan]);

  if (!mounted) return null;

  // --- CÁLCULOS DE PRECIO ---
  const activePlan = PLANS[activeIndex];
  const isAnnual = billing === 'annual';
  
  // Precio base mensual
  const monthlyPrice = activePlan.price;
  
  // Precio total anual con 10% de descuento
  // Formula: (Mensual * 12) * 0.90
  const annualTotalPrice = Math.round(monthlyPrice * 12 * 0.90);
  
  // Ahorro total en dinero
  const savings = Math.round((monthlyPrice * 12) - annualTotalPrice);

  // Qué precio mostrar en el número grande
  // Si es anual, mostramos el TOTAL A PAGAR POR AÑO (ej. $12,193)
  const priceToDisplay = isAnnual ? annualTotalPrice : monthlyPrice;
  const periodLabel = isAnnual ? 'MXN / AÑO' : 'MXN / MES';

  return (
    <div className="h-screen w-full bg-[#050505] text-white font-sans overflow-hidden flex flex-col lg:flex-row relative selection:bg-[#FDCB02] selection:text-black">
      
      {/* --- BACKGROUND --- */}
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,#1a1a1a_0%,#000000_100%)]" />
          <div className="absolute inset-0 opacity-[0.04] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />
          <motion.div 
            animate={{ background: activePlan.glowColor }}
            transition={{ duration: 0.8 }}
            className="absolute left-[25%] top-1/2 -translate-y-1/2 w-[800px] h-[800px] blur-[250px] rounded-full opacity-20 mix-blend-screen"
          />
      </div>

      {/* --- COLUMNA IZQUIERDA: STACK DE 4 TARJETAS --- */}
      <div className="w-full lg:w-1/2 h-[55vh] lg:h-full flex items-center justify-center relative perspective-2000 z-20">
          
          <button onClick={prevPlan} className="absolute left-4 lg:left-12 p-3 rounded-full border border-white/10 hover:bg-white hover:text-black transition-all z-50 bg-black/40 backdrop-blur-md">
              <ChevronLeft size={24} />
          </button>
          <button onClick={nextPlan} className="absolute right-4 lg:right-12 p-3 rounded-full border border-white/10 hover:bg-white hover:text-black transition-all z-50 bg-black/40 backdrop-blur-md">
              <ChevronRight size={24} />
          </button>

          <div className="relative w-full h-full flex items-center justify-center">
              <AnimatePresence initial={false} mode='popLayout'>
                  {PLANS.map((plan, index) => {
                      const isActive = index === activeIndex;
                      let offset = index - activeIndex;
                      
                      if (offset < -1) offset += PLANS.length; 
                      if (offset > 1) offset -= PLANS.length;
                      if (offset === 2) offset = -2;

                      const isVisible = Math.abs(offset) <= 1 || isActive;
                      if (!isVisible) return null;

                      return (
                          <motion.div
                              key={plan.key}
                              onClick={() => setActiveIndex(index)}
                              initial={{ opacity: 0, y: 100, scale: 0.8 }}
                              animate={{ 
                                  x: isActive ? 0 : offset * 50, 
                                  y: isActive ? 0 : offset * 140, 
                                  z: isActive ? 0 : -100, 
                                  scale: isActive ? 1.1 : 0.9,
                                  rotateX: isActive ? 0 : 40, 
                                  rotateZ: isActive ? 0 : offset * -3, 
                                  zIndex: isActive ? 50 : 10 - Math.abs(offset), 
                                  opacity: 1, 
                                  filter: isActive 
                                    ? 'brightness(1) drop-shadow(0 50px 80px rgba(0,0,0,0.8))' 
                                    : 'brightness(0.35) blur(1px)'
                              }}
                              transition={{ type: "spring", stiffness: 120, damping: 20, mass: 1 }}
                              className={`
                                absolute w-[300px] h-[190px] lg:w-[480px] lg:h-[300px] 
                                cursor-pointer rounded-2xl origin-center preserve-3d overflow-hidden 
                                border-t border-l ${plan.borderColor}
                              `}
                              style={{ transformStyle: 'preserve-3d' }}
                          >
                                <div className={`absolute inset-0 ${plan.bgClass}`} />
                                <div className="absolute inset-0 opacity-15 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-multiply pointer-events-none" />
                                
                                <div className={`relative h-full w-full p-6 lg:p-8 flex flex-col justify-between ${plan.textColor}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2 opacity-90">
                                            <Target size={20} strokeWidth={2.5} />
                                            <span className="text-lg font-[1000] italic uppercase tracking-tighter leading-none">COYOTE</span>
                                        </div>
                                        <div className="border border-current px-2 py-0.5 rounded text-[7px] lg:text-[9px] font-black uppercase tracking-widest opacity-60">
                                            {plan.tag}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center justify-center flex-1 my-2">
                                        <span className="text-4xl lg:text-7xl font-[1000] uppercase tracking-tighter leading-none text-center opacity-95 drop-shadow-lg">
                                            {plan.key}
                                        </span>
                                        <div className="w-10 h-1 bg-current mt-3 opacity-40 rounded-full"/>
                                    </div>

                                    <div className="flex justify-between items-end opacity-80">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase tracking-wider mb-0.5 opacity-70">ID ACCESO</span>
                                            <div className="flex items-center gap-2 font-mono text-xs font-bold">
                                                <Fingerprint size={12} />
                                                <span>MX-{plan.id}9-2026</span>
                                            </div>
                                        </div>
                                        <QrCode size={28} className="opacity-70" />
                                    </div>
                                </div>

                                {isActive && (
                                      <motion.div 
                                          animate={{ x: ['-150%', '150%'] }}
                                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 pointer-events-none z-30 mix-blend-soft-light"
                                      />
                                )}
                          </motion.div>
                      );
                  })}
              </AnimatePresence>
          </div>
      </div>

      {/* --- COLUMNA DERECHA: INFORMACIÓN Y SUSCRIPCIÓN --- */}
      <div className="w-full lg:w-1/2 h-[45vh] lg:h-full relative z-20 flex flex-col justify-center px-6 lg:px-20 py-8 lg:py-0 bg-gradient-to-t lg:bg-gradient-to-l from-black via-[#050505] to-transparent">
          
          <AnimatePresence mode="wait">
              <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full max-w-lg mx-auto lg:mx-0"
              >
                  {/* Título del Plan */}
                  <div className="mb-6">
                      <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-5xl lg:text-7xl font-[1000] uppercase italic text-white leading-none tracking-tighter">
                              {activePlan.key}
                          </h2>
                          {activePlan.recommended && (
                              <span className="bg-[#FDCB02] text-black text-[9px] font-[900] px-2 py-1 uppercase tracking-wider rounded-sm animate-pulse">
                                  Recomendado
                              </span>
                          )}
                      </div>
                      <p className="text-neutral-400 font-medium text-sm flex items-center gap-2">
                          <Activity size={14} className="text-[#FDCB02]" /> {activePlan.name}
                      </p>
                  </div>

                  {/* Lista de Beneficios */}
                  <div className="mb-8">
                      <div className="grid grid-cols-1 gap-2.5">
                          {activePlan.features.map((feature, i) => (
                              <motion.div 
                                  key={i}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.05 }}
                                  className="flex items-center gap-3 text-sm text-neutral-300 font-medium"
                              >
                                  <div className="min-w-[4px] h-[4px] bg-[#FDCB02] rounded-full" />
                                  <span className="uppercase tracking-tight">{feature}</span>
                              </motion.div>
                          ))}
                      </div>
                  </div>

                  {/* --- ZONA DE SUSCRIPCIÓN --- */}
                  <div className="bg-[#111] border border-white/10 rounded-xl p-5 mb-6">
                      
                      {/* LÓGICA: Si el precio es > 0, mostramos selector mensual/anual */}
                      {activePlan.price > 0 ? (
                          <>
                            {/* Selector Toggle */}
                            <div className="flex bg-black p-1 rounded-lg border border-white/5 mb-4">
                                <button 
                                    onClick={() => setBilling('monthly')}
                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${billing === 'monthly' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                                >
                                    Mensual
                                </button>
                                <button 
                                    onClick={() => setBilling('annual')}
                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-md transition-all flex items-center justify-center gap-2 ${billing === 'annual' ? 'bg-[#FDCB02] text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                                >
                                    Anual <span className="bg-black/20 px-1.5 py-0.5 rounded text-[8px]">-10%</span>
                                </button>
                            </div>

                            <div className="flex items-end justify-between">
                                <div>
                                    {/* Precio con formato de moneda */}
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl lg:text-5xl font-[1000] tracking-tighter text-white">
                                            {formatMoney(priceToDisplay)}
                                        </span>
                                        <span className="text-[10px] text-neutral-500 font-bold uppercase mb-1">{periodLabel}</span>
                                    </div>
                                    
                                    {/* Texto de ahorro */}
                                    {isAnnual && (
                                        <p className="text-[10px] text-[#FDCB02] font-mono mt-1 flex items-center gap-1">
                                            <Zap size={10} fill="currentColor" />
                                            Ahorras {formatMoney(savings)} al año
                                        </p>
                                    )}
                                </div>
                                
                                <button className="h-12 px-6 bg-[#FDCB02] hover:bg-white text-black font-[1000] uppercase text-[10px] lg:text-xs tracking-widest rounded-md transition-colors flex items-center gap-3 shadow-lg shadow-yellow-500/20">
                                    Suscribirme <ArrowRight size={16} />
                                </button>
                            </div>
                          </>
                      ) : (
                          // LÓGICA: Si es Plan Gratuito (Base)
                          <div className="flex items-center justify-between">
                              <div>
                                  <span className="text-4xl font-[1000] tracking-tighter text-white">GRATIS</span>
                                  <p className="text-[10px] text-neutral-500 font-bold uppercase mt-1">Acceso de por vida</p>
                              </div>
                              <button className="h-12 px-8 bg-white hover:bg-[#FDCB02] text-black font-[1000] uppercase text-xs tracking-widest rounded-md transition-colors flex items-center gap-3">
                                  Registrarme <ArrowRight size={16} />
                              </button>
                          </div>
                      )}
                  </div>

                  {/* Footer Icons */}
                  <div className="flex gap-6 opacity-40 border-t border-white/5 pt-4">
                      <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest">
                          <Shield size={12} /> Pagos Seguros
                      </div>
                      <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest">
                          <Zap size={12} /> Activación Inmediata
                      </div>
                  </div>

              </motion.div>
          </AnimatePresence>
      </div>

    </div>
  );
}