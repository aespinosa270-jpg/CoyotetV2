'use client';
import { Info } from "lucide-react";
import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Package, Truck, ShoppingBag, Landmark, Banknote, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const method = searchParams.get('method') || 'card'; // card, bank_account, store

  const isInstantPayment = method === 'card';

  return (
    <div className="min-h-screen bg-[#fafafa] pt-32 pb-20 px-4 flex flex-col items-center selection:bg-[#FDCB02] selection:text-black">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }} 
        transition={{ duration: 0.5, type: 'spring' }}
        className="w-full max-w-2xl bg-white p-8 md:p-12 rounded-[2rem] shadow-2xl border border-neutral-100 text-center relative overflow-hidden"
      >
        
        {/* --- CABECERA DINÁMICA SEGÚN MÉTODO DE PAGO --- */}
        {isInstantPayment ? (
          // PAGO CON TARJETA (INMEDIATO)
          <>
            <div className="absolute top-0 left-0 right-0 h-2 bg-green-500"></div>
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-100 rounded-full scale-150 animate-pulse"></div>
                <CheckCircle2 size={72} className="text-green-500 relative z-10" strokeWidth={2.5}/>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-[1000] uppercase text-black mb-3 tracking-tighter">
              ¡Pago Autorizado!
            </h1>
            <p className="text-neutral-500 mb-8 max-w-md mx-auto text-sm">
              Tu tarjeta ha sido procesada con éxito y el pedido <strong>{orderId}</strong> ha pasado directamente al área de almacén para su preparación.
            </p>
          </>
        ) : (
          // PAGO CON OXXO / SPEI (PENDIENTE)
          <>
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#FDCB02]"></div>
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center">
                <Clock size={40} className="text-yellow-600" strokeWidth={2.5}/>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-[1000] uppercase text-black mb-3 tracking-tighter">
              Pedido Reservado
            </h1>
            <p className="text-neutral-500 mb-8 max-w-md mx-auto text-sm">
              Hemos apartado el inventario para tu pedido <strong>{orderId}</strong>. Ahora necesitamos que completes el pago.
            </p>

            {/* INSTRUCCIONES DE PAGO */}
            <div className="bg-[#050505] text-left p-6 rounded-2xl mb-8 border border-neutral-800 text-white shadow-xl relative overflow-hidden">
               <div className="absolute right-0 top-0 opacity-10">
                 {method === 'store' ? <Banknote size={150} className="translate-x-8 -translate-y-8"/> : <Landmark size={150} className="translate-x-8 -translate-y-8"/>}
               </div>
               <div className="relative z-10">
                  <h3 className="text-[#FDCB02] font-black uppercase text-sm mb-2 flex items-center gap-2">
                    {method === 'store' ? <><Banknote size={16}/> Pago en Tienda OXXO</> : <><Landmark size={16}/> Transferencia SPEI</>}
                  </h3>
                  <p className="text-neutral-400 text-xs mb-4 leading-relaxed">
                    Hemos enviado a tu correo electrónico registrado las instrucciones detalladas, el monto exacto y el {method === 'store' ? 'código de barras' : 'número de CLABE interbancaria'} necesario para completar tu compra.
                  </p>
                  <div className="bg-white/10 p-3 rounded-lg border border-white/5 flex items-start gap-3">
                    <Info size={16} className="text-[#FDCB02] shrink-0 mt-0.5"/>
                    <p className="text-[10px] text-neutral-300">Una vez que realices el pago, nuestro sistema lo detectará automáticamente y cambiará el estado de tu pedido a "Pagado". No es necesario que nos envíes el comprobante.</p>
                  </div>
               </div>
            </div>
          </>
        )}

        {/* --- STATUS DEL PEDIDO (COMÚN) --- */}
        <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-6 mb-10 text-left">
          <div className="flex justify-between items-center border-b border-neutral-200 pb-4 mb-4">
            <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Referencia Interna</span>
            <span className="font-mono font-bold text-black text-sm">{orderId}</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${isInstantPayment ? 'bg-black text-[#FDCB02]' : 'bg-neutral-200 text-neutral-500'}`}>
                <Package size={20} strokeWidth={2.5}/>
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Estado en Almacén</h4>
                <p className="text-sm font-bold text-black">
                  {isInstantPayment ? 'Preparando Bultos' : 'Esperando Pago'}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-neutral-200 shrink-0 shadow-sm">
                <Truck size={20} className="text-black" strokeWidth={2.5}/>
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Logística</h4>
                <p className="text-sm font-bold text-black">Notificaremos el rastreo</p>
              </div>
            </div>
          </div>
        </div>

        {/* --- BOTONES DE ACCIÓN --- */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/" 
            className="flex-1 bg-black hover:bg-[#FDCB02] text-white hover:text-black h-14 rounded-xl font-[1000] uppercase text-xs tracking-widest transition-all duration-300 flex items-center justify-center gap-2 shadow-lg"
          >
            Volver al Catálogo <ArrowRight size={16} />
          </Link>
          <button 
            onClick={() => window.print()}
            className="sm:w-1/3 bg-white border-2 border-neutral-200 hover:border-black text-black h-14 rounded-xl font-bold uppercase text-xs tracking-widest transition-all"
          >
            Imprimir Recibo
          </button>
        </div>

        <div className="mt-10 pt-6 border-t border-neutral-100">
          <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">
            Coyote Textil • Red B2B Automatizada
          </p>
        </div>

      </motion.div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center text-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-neutral-200 border-t-[#FDCB02] rounded-full animate-spin"></div>
          <span className="font-black uppercase tracking-widest text-xs">Cargando Bóveda Segura...</span>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}