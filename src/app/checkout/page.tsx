'use client';

import React, { useState, useEffect } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import Image from 'next/image';
// 1. IMPORTACIÓN CORREGIDA: AnimatePresence y Variants
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { 
  CreditCard, ShieldCheck, ChevronLeft, Terminal, Activity, 
  ShieldAlert, ArrowRight, Loader2, Package, Truck, FileText, Crown, Info, Zap
} from 'lucide-react';
import { useCart } from "@/lib/context/cart-context";

// 2. CORRECCIÓN DE ERROR DE TIPO EN VARIANTS
const containerVariants: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.8, 
      // El "as any" o "as const" soluciona el error de inferencia de tupla
      ease: [0.16, 1, 0.3, 1] as any 
    } 
  }
};

const formatPrice = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  }).format(amount);
};

export default function CheckoutPage() {
  const { cart, subTotal, serviceFee, grandTotal } = useCart();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [deviceSessionId, setDeviceSessionId] = useState('');
  
  const [shippingData, setShippingData] = useState({ name: '', email: '', phone: '', address: '', zip: '', location: '' });
  const [cardData, setCardData] = useState({ holder: '', number: '', exp: '', cvv: '' });

  const shippingCost = subTotal > 5000 ? 0 : 250;
  const finalTotal = grandTotal + shippingCost;
  const potentialSavings = subTotal * 0.10;

  useEffect(() => { 
    setMounted(true); 
    setDeviceSessionId(`k8d9s8d9s8d9s8d-${Date.now()}`);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, setFunction: any) => {
    setFunction((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert("¡Misión Cumplida! Tu orden ha sido autorizada.");
    }, 3000);
  };

  if (!mounted) return null;
  
  if (cart.length === 0) {
    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white space-y-6">
            <Activity size={64} className="text-[#FDCB02] animate-pulse" />
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">Señal Perdida</h1>
            <Link href="/" className="bg-white text-black px-8 py-3 font-black uppercase hover:bg-[#FDCB02] transition-colors">
                Reiniciar Sistema
            </Link>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#FDCB02] selection:text-black overflow-x-hidden relative">
      
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay"></div>
      <div className="fixed inset-0 z-50 pointer-events-none border-[12px] border-white/5 lg:border-[20px]"></div>
      
      <Script src="https://js.openpay.mx/openpay.v1.min.js" strategy="lazyOnload" />

      {/* --- CINTA DE PRECAUCIÓN CON GARRAS --- */}
      <div className="bg-[#FDCB02] border-y-[5px] border-black py-3 overflow-hidden whitespace-nowrap relative z-40 shadow-2xl">
        <motion.div 
          animate={{ x: [0, -1000] }} 
          transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
          className="flex items-center"
        >
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center shrink-0">
              
              {/* TEXTO 1 */}
              <span className="px-8 text-black font-black text-xl md:text-2xl italic tracking-tighter uppercase transform -skew-x-12">
                VISTIENDO LA FUERZA DE MÉXICO
              </span>

              {/* DIVISOR DE GARRAS 1 */}
              <div className="w-16 h-10 relative mx-4 transform -skew-x-1">
                 <Image 
                    src="/coyotelogo.svg" // Asegúrate de tener esta imagen en public/
                    alt="Garras Coyote"
                    fill
                 />
              </div>

              {/* TEXTO 2 */}
              <span className="px-8 text-black font-black text-xl md:text-2xl italic tracking-tighter uppercase transform -skew-x-12">
                ¡GRACIAS POR ELEGIR COYOTE TEXTIL!
              </span>

              {/* DIVISOR DE GARRAS 2 */}
              <div className="w-16 h-10 relative mx-4 transform -skew-x-12">
                 <Image 
                    src="/coyotelogo.svg" 
                    alt="Garras Coyote"
                    fill
                 />
              </div>

            </div>
          ))}
        </motion.div>
      </div>

      {/* --- HEADER --- */}
      <header className="relative z-30 pt-16 pb-10 px-8 md:px-16 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/5">
        <div className="space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 text-neutral-500 hover:text-[#FDCB02] transition-colors group mb-4">
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Abortar Misión</span>
          </Link>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter italic leading-[0.8]">
            FINALIZAR <span className="text-transparent text-stroke-white block md:inline">COMPRA</span>
          </h1>
        </div>
        
        <div className="mt-8 md:mt-0 text-right space-y-2">
            <div className="flex items-center justify-end gap-2 text-[10px] font-mono text-[#FDCB02] uppercase tracking-widest">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
                System: Online
            </div>
            <div className="text-4xl font-black italic tracking-tighter">
                {formatPrice(finalTotal)} <span className="text-sm font-bold text-[#FDCB02] not-italic ml-1">MXN</span>
            </div>
        </div>
      </header>

      <main className="relative z-20 px-6 md:px-16 py-20 grid lg:grid-cols-12 gap-20">
        
        {/* --- FORMULARIOS --- */}
        <div className="lg:col-span-7 space-y-24">
          <motion.section 
            variants={containerVariants} initial="hidden" animate="visible"
            className={`space-y-12 transition-all duration-700 ${step === 2 ? 'opacity-20 blur-[2px] pointer-events-none grayscale' : ''}`}
          >
            <div className="flex items-baseline gap-6 border-b border-white/10 pb-6">
              <span className="text-6xl font-black italic text-white/10">01</span>
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight italic">Logística de <span className="text-[#FDCB02]">Entrega</span></h2>
            </div>

            <form className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
              {[
                { label: 'Identidad (Nombre)', name: 'name', placeholder: 'TITULAR REGISTRADO' },
                { label: 'Canal (Email)', name: 'email', placeholder: 'CORREO@DOMINIO.COM' },
                { label: 'Enlace (Teléfono)', name: 'phone', placeholder: '10 DÍGITOS' },
                { label: 'Coordenadas (CP)', name: 'zip', placeholder: '00000' },
                { label: 'Dirección Exacta', name: 'address', placeholder: 'CALLE, NÚMERO Y BODEGA', span: true },
                { label: 'Sector (Ciudad)', name: 'location', placeholder: 'MÉXICO', span: true },
              ].map((f, i) => (
                <div key={i} className={`group space-y-4 ${f.span ? 'md:col-span-2' : ''}`}>
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 group-focus-within:text-[#FDCB02] transition-colors">
                     <Terminal size={12} /> {f.label}
                  </label>
                  <input 
                    type="text" name={f.name} required placeholder={f.placeholder}
                    value={(shippingData as any)[f.name]} onChange={(e) => handleInputChange(e, setShippingData)}
                    className="w-full bg-transparent border-b-2 border-white/10 py-2 text-xl font-bold uppercase text-white focus:border-[#FDCB02] outline-none transition-all placeholder:text-white/10"
                  />
                </div>
              ))}
              <div className="md:col-span-2 pt-8">
                <button type="submit" className="w-full md:w-auto bg-white text-black px-10 py-6 font-black uppercase italic tracking-widest text-lg hover:bg-[#FDCB02] transition-all">
                    Confirmar Datos <ArrowRight size={20} className="inline ml-2"/>
                </button>
              </div>
            </form>
          </motion.section>

          {/* Pago (Condicional) */}
          <AnimatePresence>
            {step === 2 && (
              <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
                <div className="flex items-baseline gap-6 border-b border-[#FDCB02]/30 pb-6">
                  <span className="text-6xl font-black italic text-[#FDCB02]/20">02</span>
                  <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight italic text-[#FDCB02]">Bóveda de <span className="text-white">Pago</span></h2>
                </div>
                <div className="bg-[#0F0F0F] border border-[#FDCB02]/30 p-8 md:p-12 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-[0.03]"><ShieldCheck size={200}/></div>
                   <form onSubmit={handlePayment} className="relative z-10 space-y-10">
                      <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Número de Tarjeta</label>
                         <input type="text" placeholder="0000 0000 0000 0000" className="w-full bg-transparent border-b-2 border-white/20 py-4 text-2xl md:text-4xl font-black tracking-widest focus:border-[#FDCB02] outline-none font-mono" />
                      </div>
                      <div className="grid grid-cols-2 gap-10">
                        <input type="text" placeholder="MM/AA" className="w-full bg-transparent border-b-2 border-white/20 py-4 text-xl font-black text-center focus:border-[#FDCB02] outline-none" />
                        <input type="password" placeholder="CVC" className="w-full bg-transparent border-b-2 border-white/20 py-4 text-xl font-black text-center focus:border-[#FDCB02] outline-none" />
                      </div>
                      <button className="w-full bg-[#FDCB02] text-black font-black uppercase py-6 text-xl italic tracking-widest hover:bg-white transition-all">
                        {loading ? 'Procesando Misión...' : 'Inicializar Pago Final'}
                      </button>
                   </form>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* --- LADO DERECHO: MANIFIESTO --- */}
        <div className="lg:col-span-5 hidden lg:block">
          <div className="sticky top-32 border-2 border-white/5 bg-[#0a0a0a] p-8 space-y-8 shadow-2xl relative">
            <h3 className="text-lg font-black uppercase tracking-[0.3em] border-b border-white/10 pb-6">
              Manifiesto de Carga <span className="text-[#FDCB02]">[{cart.length}]</span>
            </h3>
            
            <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-4 group">
                  <div className="w-16 h-16 bg-neutral-900 relative shrink-0 overflow-hidden border border-white/5">
                    {item.thumbnail && <Image src={item.thumbnail} alt={item.title} fill className="object-cover grayscale group-hover:grayscale-0 transition-all" />}
                  </div>
                  <div className="flex flex-col justify-between py-1 flex-1">
                    <h4 className="font-black uppercase text-[10px] tracking-tight group-hover:text-[#FDCB02] transition-colors leading-none">{item.title}</h4>
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-bold bg-white/5 px-2 py-0.5 rounded-sm uppercase">{item.quantity} {item.unit}</span>
                      <span className="text-sm font-black italic">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* UPSELL MEMBRESÍA */}
            <div className="bg-[#111] border border-[#FDCB02]/20 p-4 relative overflow-hidden group">
               <div className="absolute -right-2 -top-2 opacity-10 group-hover:opacity-20 transition-opacity"><Crown size={48}/></div>
               <div className="relative z-10 flex items-start gap-3">
                  <Zap size={16} className="text-[#FDCB02] mt-1 shrink-0 animate-pulse" />
                  <div>
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-white mb-1">Oportunidad Detectada</h4>
                     <p className="text-[9px] text-neutral-400 leading-relaxed">Ahorra <span className="text-[#FDCB02] font-bold">{formatPrice(potentialSavings)} MXN</span> activando Gold.</p>
                     <Link href="/membresia" className="text-[9px] font-black uppercase bg-[#FDCB02] text-black px-2 py-1 inline-block mt-2">Activar Membresía</Link>
                  </div>
               </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10 font-bold uppercase tracking-widest text-[10px]">
              <div className="flex justify-between text-neutral-500"><span>Subtotal Cargo</span><span>{formatPrice(subTotal)}</span></div>
              <div className="flex justify-between text-neutral-500"><span>Tarifa Logística</span><span>{shippingCost === 0 ? "SIN CARGO" : formatPrice(shippingCost)}</span></div>
              <div className="flex justify-between text-3xl pt-4 text-white italic font-black tracking-tighter border-t border-white/10">
                <span>Total</span>
                <span className="text-[#FDCB02]">{formatPrice(finalTotal)} <span className="text-xs text-white/50 not-italic ml-1">MXN</span></span>
              </div>
              <div className="flex items-start gap-2 py-2">
                  <Info size={10} className="text-neutral-600 mt-0.5"/>
                  <p className="text-[9px] text-neutral-600 font-mono leading-tight uppercase">Los precios aquí mostrados son en moneda nacional mexicana (MXN).</p>
              </div>
            </div>

            <a href="https://wa.me/525512345678" target="_blank" className="w-full flex items-center justify-center gap-2 border border-white/20 py-3 text-[10px] font-black uppercase text-neutral-400 hover:bg-white hover:text-black transition-all">
               <FileText size={12}/> ¿Requieres Factura? (WhatsApp)
            </a>
          </div>
        </div>
      </main>

      <style jsx global>{`
        .text-stroke-white { -webkit-text-stroke: 1px rgba(255,255,255,0.3); color: transparent; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #FDCB02; }
      `}</style>
    </div>
  );
}