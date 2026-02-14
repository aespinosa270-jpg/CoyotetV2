'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, Activity, Target, 
  ChevronRight, ChevronLeft, Fingerprint, Shield, Zap, QrCode, 
  Loader2, X, CreditCard, Building2, Store, Lock
} from 'lucide-react';
import Script from 'next/script';

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const PLANS = [
  {
    id: 0, key: 'BASE', name: 'Acceso Inicial', price: 0, 
    bgClass: 'bg-gradient-to-br from-[#e3e3e3] via-[#c4c4c4] to-[#8a8a8a]',
    glowColor: 'rgba(255,255,255,0.3)',
    textColor: 'text-neutral-900',
    borderColor: 'border-white/60',
    features: ['0.5 Puntos por cada $100 MXN', 'Acceso a Catálogo Global', 'Sin acceso a apartados'],
    tag: 'STANDARD MEMBER'
  },
  {
    id: 1, key: 'GOLD', name: 'Socio Comercial', price: 499, 
    bgClass: 'bg-gradient-to-br from-[#FFD700] via-[#FDCB02] to-[#B8860B]',
    glowColor: 'rgba(253, 203, 2, 0.6)',
    textColor: 'text-black',
    borderColor: 'border-yellow-200/50',
    recommended: true,
    features: ['7 Días de Apartado', '3 Colocaciones s/costo', '1 Punto por cada $100 MXN'],
    tag: 'PRIORITY MEMBER'
  },
  {
    id: 2, key: 'BLACK', name: 'Socio Ejecutivo', price: 799, 
    bgClass: 'bg-gradient-to-br from-[#333] via-[#1a1a1a] to-[#000]',
    glowColor: 'rgba(255,255,255,0.2)',
    textColor: 'text-white',
    borderColor: 'border-white/20',
    features: ['7 Días de Apartado', '6 Colocaciones s/costo', '2 Puntos por cada $100 MXN', 'Prioridad en Paquetería', 'Muestrarios Gratis'],
    tag: 'EXECUTIVE ACCESS'
  },
  {
    id: 3, key: 'ELITE', name: 'Master Partner', price: 1129, 
    bgClass: 'bg-gradient-to-br from-[#2b3a42] via-[#1c252b] to-[#0b0e11]',
    glowColor: 'rgba(100, 200, 255, 0.3)',
    textColor: 'text-white',
    borderColor: 'border-cyan-900/30',
    features: ['15 Días de Apartado', '10 Colocaciones s/costo', '4 Puntos por cada $100 MXN', 'Acceso 30 días antes a Novedades', 'Prioridad Total en Despacho', 'Muestrarios & Regalos Textiles'],
    tag: 'ELITE PARTNER'
  }
];

declare global {
  interface Window {
    OpenPay: any;
  }
}

export default function MembershipStack() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(1);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Estados del Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'spei' | 'store'>('card');
  const [cardData, setCardData] = useState({ holder: '', number: '', expMonth: '', expYear: '', cvv: '' });
  const [paymentError, setPaymentError] = useState('');
  const [openPayReady, setOpenPayReady] = useState(false);

  useEffect(() => {
    setMounted(true);
    const initInterval = setInterval(() => {
      if (typeof window !== 'undefined' && window.OpenPay && window.OpenPay.deviceData) {
        window.OpenPay.setId(process.env.NEXT_PUBLIC_OPENPAY_MERCHANT_ID);
        window.OpenPay.setApiKey(process.env.NEXT_PUBLIC_OPENPAY_PUBLIC_KEY);
        window.OpenPay.setSandboxMode(true);
        setOpenPayReady(true);
        clearInterval(initInterval);
      }
    }, 300);
    return () => clearInterval(initInterval);
  }, []);

  const nextPlan = useCallback(() => setActiveIndex((prev) => (prev + 1) % PLANS.length), []);
  const prevPlan = useCallback(() => setActiveIndex((prev) => (prev - 1 + PLANS.length) % PLANS.length), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showPaymentModal) return; 
      if (e.key === 'ArrowRight') nextPlan();
      if (e.key === 'ArrowLeft') prevPlan();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextPlan, prevPlan, showPaymentModal]);

  const activePlan = PLANS[activeIndex];
  const isAnnual = billing === 'annual';
  const monthlyPrice = activePlan.price;
  const annualTotalPrice = Math.round(monthlyPrice * 12 * 0.90);
  const savings = Math.round((monthlyPrice * 12) - annualTotalPrice);
  const priceToDisplay = isAnnual ? annualTotalPrice : monthlyPrice;
  const periodLabel = isAnnual ? 'MXN / AÑO' : 'MXN / MES';

  const handleInitiatePurchase = () => {
    if (!session) {
      router.push('/login?callbackUrl=/membresia');
      return;
    }
    if (activePlan.price === 0) {
      processServerCheckout(null, null, 'free');
    } else {
      setShowPaymentModal(true);
    }
  };

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPaymentError('');

    if (!openPayReady || !window.OpenPay || !window.OpenPay.deviceData) {
      setPaymentError("Conectando con túnel bancario... Espera 2 segundos e intenta de nuevo.");
      setLoading(false);
      return;
    }

    try {
      const deviceSessionId = window.OpenPay.deviceData.setup("payment-form");

      // Si eligen SPEI o Tienda, no ocupamos tokenizar tarjeta, mandamos directo al backend
      if (paymentMethod === 'spei' || paymentMethod === 'store') {
        processServerCheckout(null, deviceSessionId, paymentMethod);
        return;
      }

      // Si es Tarjeta, Tokenizamos
      window.OpenPay.token.create({
        "card_number": cardData.number.replace(/\s/g, ''),
        "holder_name": cardData.holder,
        "expiration_year": cardData.expYear,
        "expiration_month": cardData.expMonth,
        "cvv2": cardData.cvv
      }, 
      (response: any) => {
        const tokenId = response.data.id;
        processServerCheckout(tokenId, deviceSessionId, 'card');
      }, 
      (error: any) => {
        setPaymentError(error.data.description || "Tarjeta declinada o inválida.");
        setLoading(false);
      });
    } catch (err: any) {
      setPaymentError("Error de encriptación. Contacta a soporte Coyote.");
      setLoading(false);
    }
  };

  const processServerCheckout = async (tokenId: string | null, deviceSessionId: string | null, method: string) => {
    try {
      const response = await fetch('/api/membership/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planKey: activePlan.key,
          price: priceToDisplay,
          billingCycle: billing,
          tokenId: tokenId,
          deviceSessionId: deviceSessionId,
          paymentMethod: method // Mandamos el método al backend
        })
      });

      if (response.ok) {
        setShowPaymentModal(false);
        // Aquí podrías redirigir a una pantalla de "Instrucciones de pago" si es SPEI/OXXO
        router.push(method === 'card' || method === 'free' ? '/perfil?status=success' : '/perfil?status=pending_payment');
      } else {
        const errorText = await response.text();
        setPaymentError(errorText || "Error en la pasarela bancaria.");
      }
    } catch (err) {
      setPaymentError("Error de red. Revisa tu conexión a internet.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <>
      <Script src="https://js.openpay.mx/openpay.v1.min.js" strategy="afterInteractive" />
      <Script src="https://js.openpay.mx/openpay-data.v1.min.js" strategy="afterInteractive" />

      <div className="h-screen w-full bg-[#050505] text-white font-sans overflow-hidden flex flex-col lg:flex-row relative selection:bg-[#FDCB02] selection:text-black">
        
        {/* --- BACKGROUND --- */}
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,#1a1a1a_0%,#000000_100%)]" />
            <div className="absolute inset-0 opacity-[0.04] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />
            <motion.div animate={{ background: activePlan.glowColor }} transition={{ duration: 0.8 }} className="absolute left-[25%] top-1/2 -translate-y-1/2 w-[800px] h-[800px] blur-[250px] rounded-full opacity-20 mix-blend-screen" />
        </div>

        {/* --- COLUMNA IZQUIERDA --- */}
        <div className="w-full lg:w-1/2 h-[55vh] lg:h-full flex items-center justify-center relative perspective-2000 z-20">
            <button onClick={prevPlan} disabled={showPaymentModal} className="absolute left-4 lg:left-12 p-3 rounded-full border border-white/10 hover:bg-white hover:text-black transition-all z-50 bg-black/40 backdrop-blur-md disabled:opacity-50"><ChevronLeft size={24} /></button>
            <button onClick={nextPlan} disabled={showPaymentModal} className="absolute right-4 lg:right-12 p-3 rounded-full border border-white/10 hover:bg-white hover:text-black transition-all z-50 bg-black/40 backdrop-blur-md disabled:opacity-50"><ChevronRight size={24} /></button>
            <div className="relative w-full h-full flex items-center justify-center">
                <AnimatePresence initial={false} mode='popLayout'>
                    {PLANS.map((plan, index) => {
                        const isActive = index === activeIndex;
                        let offset = index - activeIndex;
                        if (offset < -1) offset += PLANS.length; 
                        if (offset > 1) offset -= PLANS.length;
                        if (offset === 2) offset = -2;
                        if (!(Math.abs(offset) <= 1 || isActive)) return null;
                        return (
                            <motion.div key={plan.key} onClick={() => !showPaymentModal && setActiveIndex(index)} initial={{ opacity: 0, y: 100, scale: 0.8 }} animate={{ x: isActive ? 0 : offset * 50, y: isActive ? 0 : offset * 140, z: isActive ? 0 : -100, scale: isActive ? 1.1 : 0.9, rotateX: isActive ? 0 : 40, rotateZ: isActive ? 0 : offset * -3, zIndex: isActive ? 50 : 10 - Math.abs(offset), opacity: 1, filter: isActive ? 'brightness(1) drop-shadow(0 50px 80px rgba(0,0,0,0.8))' : 'brightness(0.35) blur(1px)' }} transition={{ type: "spring", stiffness: 120, damping: 20, mass: 1 }} className={`absolute w-[300px] h-[190px] lg:w-[480px] lg:h-[300px] ${!showPaymentModal ? 'cursor-pointer' : ''} rounded-2xl origin-center preserve-3d overflow-hidden border-t border-l ${plan.borderColor}`} style={{ transformStyle: 'preserve-3d' }}>
                                  <div className={`absolute inset-0 ${plan.bgClass}`} />
                                  <div className="absolute inset-0 opacity-15 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-multiply pointer-events-none" />
                                  <div className={`relative h-full w-full p-6 lg:p-8 flex flex-col justify-between ${plan.textColor}`}>
                                      <div className="flex justify-between items-start">
                                          <div className="flex items-center gap-2 opacity-90"><Target size={20} strokeWidth={2.5} /><span className="text-lg font-[1000] italic uppercase tracking-tighter leading-none">COYOTE</span></div>
                                          <div className="border border-current px-2 py-0.5 rounded text-[7px] lg:text-[9px] font-black uppercase tracking-widest opacity-60">{plan.tag}</div>
                                      </div>
                                      <div className="flex flex-col items-center justify-center flex-1 my-2"><span className="text-4xl lg:text-7xl font-[1000] uppercase tracking-tighter leading-none text-center opacity-95 drop-shadow-lg">{plan.key}</span><div className="w-10 h-1 bg-current mt-3 opacity-40 rounded-full"/></div>
                                      <div className="flex justify-between items-end opacity-80"><div className="flex flex-col"><span className="text-[8px] font-black uppercase tracking-wider mb-0.5 opacity-70">ID ACCESO</span><div className="flex items-center gap-2 font-mono text-xs font-bold"><Fingerprint size={12} /><span>MX-{plan.id}9-2026</span></div></div><QrCode size={28} className="opacity-70" /></div>
                                  </div>
                                  {isActive && ( <motion.div animate={{ x: ['-150%', '150%'] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 pointer-events-none z-30 mix-blend-soft-light" /> )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>

        {/* --- COLUMNA DERECHA --- */}
        <div className="w-full lg:w-1/2 h-[45vh] lg:h-full relative z-20 flex flex-col justify-center px-6 lg:px-20 py-8 lg:py-0 bg-gradient-to-t lg:bg-gradient-to-l from-black via-[#050505] to-transparent">
            <AnimatePresence mode="wait">
                <motion.div key={activeIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="w-full max-w-lg mx-auto lg:mx-0">
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-5xl lg:text-7xl font-[1000] uppercase italic text-white leading-none tracking-tighter">{activePlan.key}</h2>
                            {activePlan.recommended && ( <span className="bg-[#FDCB02] text-black text-[9px] font-[900] px-2 py-1 uppercase tracking-wider rounded-sm animate-pulse">Recomendado</span> )}
                        </div>
                        <p className="text-neutral-400 font-medium text-sm flex items-center gap-2"><Activity size={14} className="text-[#FDCB02]" /> {activePlan.name}</p>
                    </div>

                    <div className="mb-8">
                        <div className="grid grid-cols-1 gap-2.5">
                            {activePlan.features.map((feature, i) => (
                                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 text-sm text-neutral-300 font-medium">
                                    <div className="min-w-[4px] h-[4px] bg-[#FDCB02] rounded-full" /><span className="uppercase tracking-tight">{feature}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#111] border border-white/10 rounded-xl p-5 mb-6">
                        {activePlan.price > 0 ? (
                            <>
                              <div className="flex bg-black p-1 rounded-lg border border-white/5 mb-4 font-black uppercase text-[10px] tracking-widest">
                                  <button onClick={() => setBilling('monthly')} className={`flex-1 py-3 rounded-md transition-all ${billing === 'monthly' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}>Mensual</button>
                                  <button onClick={() => setBilling('annual')} className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-md transition-all ${billing === 'annual' ? 'bg-[#FDCB02] text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}>Anual <span className="bg-black/20 px-1.5 py-0.5 rounded text-[8px]">-10%</span></button>
                              </div>
                              <div className="flex items-end justify-between">
                                  <div>
                                      <div className="flex items-baseline gap-1">
                                          <span className="text-4xl lg:text-5xl font-[1000] tracking-tighter text-white">{formatMoney(priceToDisplay)}</span>
                                          <span className="text-[10px] text-neutral-500 font-bold uppercase mb-1">{periodLabel}</span>
                                      </div>
                                      {isAnnual && ( <p className="text-[10px] text-[#FDCB02] font-mono mt-1 flex items-center gap-1"><Zap size={10} fill="currentColor" /> Ahorras {formatMoney(savings)} al año</p> )}
                                  </div>
                                  <button onClick={handleInitiatePurchase} className="h-12 px-6 bg-[#FDCB02] hover:bg-white text-black font-[1000] uppercase text-[10px] lg:text-xs tracking-widest rounded-md transition-colors flex items-center gap-3 shadow-lg shadow-yellow-500/20">
                                      Suscribirme <ArrowRight size={16} />
                                  </button>
                              </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div><span className="text-4xl font-[1000] tracking-tighter text-white">GRATIS</span><p className="text-[10px] text-neutral-500 font-bold uppercase mt-1">Acceso de por vida</p></div>
                                <button onClick={handleInitiatePurchase} className="h-12 px-8 bg-white hover:bg-[#FDCB02] text-black font-[1000] uppercase text-xs tracking-widest rounded-md transition-colors flex items-center gap-3">
                                    Registrarme <ArrowRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-6 opacity-40 border-t border-white/5 pt-4">
                        <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest"><Shield size={12} /> Pagos Seguros</div>
                        <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest"><Zap size={12} /> Activación Inmediata</div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
      </div>

      {/* --- MODAL DE PAGO PREMIUM (DISEÑO CHINGÓN) --- */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-[#050505] border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(253,203,2,0.1)] flex flex-col"
            >
              {/* HEADER DEL MODAL */}
              <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FDCB02]/50 to-transparent"></div>
                <div>
<h3 className="text-xl font-mono font-black uppercase text-white tracking-[0.3em] drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] flex items-center gap-2">                    <Shield size={20} className="text-[#FDCB02]" /> membresias coyote
                  </h3>
                  <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-1">
                    Suscripción {activePlan.key} • <span className="text-white">{formatMoney(priceToDisplay)}</span>
                  </p>
                </div>
                <button onClick={() => !loading && setShowPaymentModal(false)} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-colors text-neutral-400 hover:text-white border border-white/5">
                  <X size={18} />
                </button>
              </div>

              <form id="payment-form" onSubmit={handleProcessPayment} className="flex-1 flex flex-col">
                <div className="p-6 md:p-8">
                  
                  {/* SELECTOR DE MÉTODO DE PAGO */}
                  <div className="flex gap-2 p-1.5 bg-[#111] rounded-2xl border border-white/5 mb-8">
                    <button type="button" onClick={() => setPaymentMethod('card')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${paymentMethod === 'card' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}>
                      <CreditCard size={14} /> Tarjeta
                    </button>
                    <button type="button" onClick={() => setPaymentMethod('spei')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${paymentMethod === 'spei' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}>
                      <Building2 size={14} /> SPEI
                    </button>
                    <button type="button" onClick={() => setPaymentMethod('store')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${paymentMethod === 'store' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}>
                      <Store size={14} /> Efectivo
                    </button>
                  </div>

                  {paymentError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest mb-6 flex items-start gap-3">
                      <Zap size={14} className="shrink-0 mt-0.5" /> {paymentError}
                    </div>
                  )}

                  {/* CONTENIDO DINÁMICO POR MÉTODO */}
                  <AnimatePresence mode="wait">
                    
                    {/* TAB: TARJETA */}
                    {paymentMethod === 'card' && (
                      <motion.div key="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2">Nombre del Titular</label>
                          <input type="text" required data-openpay-card="holder_name" value={cardData.holder} onChange={e => setCardData({...cardData, holder: e.target.value})} className="w-full bg-[#111] border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:border-[#FDCB02] focus:ring-1 focus:ring-[#FDCB02] transition-colors outline-none uppercase font-bold tracking-wider" placeholder="EJ. JUAN PÉREZ" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2">Número de Tarjeta</label>
                          <div className="relative">
                            <CreditCard size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-600" />
                            <input type="text" required data-openpay-card="card_number" maxLength={19} value={cardData.number} onChange={e => setCardData({...cardData, number: e.target.value})} className="w-full bg-[#111] border border-white/10 rounded-xl pl-14 pr-5 py-4 text-sm text-white focus:border-[#FDCB02] focus:ring-1 focus:ring-[#FDCB02] transition-colors outline-none font-mono tracking-[0.2em]" placeholder="0000 0000 0000 0000" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                          <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2">Expiración (MM/AA)</label>
                            <div className="flex items-center bg-[#111] border border-white/10 rounded-xl focus-within:border-[#FDCB02] focus-within:ring-1 focus-within:ring-[#FDCB02] transition-colors overflow-hidden px-2">
                              <input type="text" required data-openpay-card="expiration_month" maxLength={2} value={cardData.expMonth} onChange={e => setCardData({...cardData, expMonth: e.target.value})} className="w-1/2 bg-transparent py-4 text-sm text-white outline-none font-mono text-center placeholder:text-neutral-700" placeholder="MM" />
                              <span className="text-neutral-700 font-mono">/</span>
                              <input type="text" required data-openpay-card="expiration_year" maxLength={2} value={cardData.expYear} onChange={e => setCardData({...cardData, expYear: e.target.value})} className="w-1/2 bg-transparent py-4 text-sm text-white outline-none font-mono text-center placeholder:text-neutral-700" placeholder="AA" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2">CVV / CVC</label>
                            <input type="password" required data-openpay-card="cvv2" maxLength={4} value={cardData.cvv} onChange={e => setCardData({...cardData, cvv: e.target.value})} className="w-full bg-[#111] border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:border-[#FDCB02] focus:ring-1 focus:ring-[#FDCB02] transition-colors outline-none font-mono text-center tracking-[0.3em]" placeholder="***" />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* TAB: SPEI */}
                    {paymentMethod === 'spei' && (
                      <motion.div key="spei" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="py-6 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-6">
                          <Building2 size={32} className="text-[#FDCB02]" />
                        </div>
                        <h4 className="text-lg font-[1000] text-white uppercase tracking-widest mb-2">Transferencia Bancaria</h4>
                        <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest leading-relaxed max-w-xs">
                          Generaremos una CLABE interbancaria única asociada a tu cuenta. El sistema detectará el pago al instante.
                        </p>
                      </motion.div>
                    )}

                    {/* TAB: TIENDAS */}
                    {paymentMethod === 'store' && (
                      <motion.div key="store" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="py-6 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-6">
                          <Store size={32} className="text-[#FDCB02]" />
                        </div>
                        <h4 className="text-lg font-[1000] text-white uppercase tracking-widest mb-2">Pago en Efectivo</h4>
                        <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest leading-relaxed max-w-xs">
                          Presenta el código de barras en OXXO, 7-Eleven, Farmacias del Ahorro o más de 30,000 establecimientos.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>

                {/* FOOTER DEL MODAL Y LOGOS */}
                <div className="mt-auto bg-[#0A0A0A] p-6 md:p-8 border-t border-white/5">
                  <button type="submit" disabled={loading} className="w-full h-14 bg-[#FDCB02] hover:bg-white text-black font-[1000] uppercase text-xs tracking-[0.2em] rounded-xl transition-all shadow-[0_0_30px_rgba(253,203,2,0.15)] flex items-center justify-center gap-3 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]">
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (
                      <>
                        <Lock size={16} /> 
                        {paymentMethod === 'card' ? `Pagar ${formatMoney(priceToDisplay)}` : 'Generar Referencia de Pago'}
                      </>
                    )}
                  </button>
                  
                  {/* BARRA DE CONFIANZA */}
                  <div className="mt-8 flex flex-col items-center gap-4">
                    <p className="text-[8px] text-neutral-600 uppercase tracking-widest font-black flex items-center gap-2">
                      <Shield size={10} /> Conexión Encriptada PCI DSS
                    </p>
                    <div className="flex items-center justify-center gap-6 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4 w-auto brightness-0 invert" />
                      <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-5 w-auto brightness-0 invert" />
                      <img src="https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg" alt="Amex" className="h-5 w-auto brightness-0 invert" />
                      <div className="w-px h-6 bg-white/20"></div>
                      <img src="https://raw.githubusercontent.com/open-pay/openpay-js/master/src/assets/openpay.png" alt="OpenPay" className="h-7 w-auto brightness-0 invert" />
                    </div>
                  </div>
                </div>

              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}