'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Package, Truck, ArrowRight, ShoppingBag } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-4">
      <div className="container mx-auto max-w-[600px] text-center">
        {/* Icono de Éxito Animado */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-green-100 rounded-full scale-150 animate-pulse"></div>
            <CheckCircle2 size={80} className="text-green-600 relative z-10" />
          </div>
        </div>

        <h1 className="text-4xl font-black uppercase text-black mb-4 tracking-tighter">
          ¡Pedido Confirmado!
        </h1>
        <p className="text-neutral-500 mb-8 text-lg">
          Gracias por tu compra. Tu pedido ha sido procesado correctamente y ya estamos preparando tus telas.
        </p>

        {/* Card de Información del Pedido */}
        <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-6 mb-10 text-left">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-neutral-200 pb-4">
              <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-widest">ID del Pedido</span>
              <span className="font-mono font-bold text-black">{orderId || 'C-4829302'}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-neutral-100 shrink-0">
                  <Package size={18} className="text-neutral-900" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-black">Estado</h4>
                  <p className="text-sm text-neutral-500">Preparando Envío</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-neutral-100 shrink-0">
                  <Truck size={18} className="text-neutral-900" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-black">Entrega Estimada</h4>
                  <p className="text-sm text-neutral-500">3-5 días hábiles</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/" 
            className="bg-[#FDCB02] hover:bg-black hover:text-white text-black px-8 py-4 rounded-xl font-bold uppercase flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            Seguir Comprando <ShoppingBag size={18} />
          </Link>
          <button 
            onClick={() => window.print()}
            className="border border-neutral-200 hover:bg-neutral-100 text-neutral-600 px-8 py-4 rounded-xl font-bold uppercase transition-all"
          >
            Imprimir Ticket
          </button>
        </div>

        <p className="mt-12 text-xs text-neutral-400 uppercase font-bold tracking-widest">
          Coyote Textil • Calidad que se siente
        </p>
      </div>
    </div>
  );
}

// Implementamos Suspense porque useSearchParams lo requiere en Next.js App Router
export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando confirmación...</div>}>
      <SuccessContent />
    </Suspense>
  );
}