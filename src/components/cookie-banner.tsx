'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, ShieldCheck, X } from 'lucide-react';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Verificamos si ya aceptó las cookies antes
    const consent = localStorage.getItem('coyote_cookie_consent');
    if (!consent) {
      // Si no hay registro, mostramos el banner después de 1 segundo
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    // Guardamos la decisión y ocultamos
    localStorage.setItem('coyote_cookie_consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6 flex justify-center pointer-events-none">
      <div className="bg-[#0a0a0a] border border-white/10 shadow-2xl rounded-xl max-w-3xl w-full pointer-events-auto overflow-hidden relative group animate-in slide-in-from-bottom-10 fade-in duration-500">
        
        {/* Efecto de ruido de fondo (Branding) */}
        <div 
            className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-overlay" 
            style={{ backgroundImage: `url("https://grainy-gradients.vercel.app/noise.svg")` }} 
        />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 p-1">
          
          {/* Icono */}
          <div className="hidden md:flex h-12 w-12 bg-neutral-900 rounded-full items-center justify-center border border-white/5 shrink-0 text-[#FDCB02]">
            <Cookie size={20} />
          </div>

          {/* Texto */}
          <div className="flex-1 space-y-2">
            <h4 className="text-white font-bold text-sm uppercase flex items-center gap-2">
              Transparencia Digital <ShieldCheck size={12} className="text-green-500"/>
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-xl">
              Utilizamos cookies propias y de terceros (OpenPay) para garantizar la seguridad de tus pagos, prevenir fraudes y mejorar tu experiencia de navegación. Al continuar, aceptas nuestro uso de datos.
            </p>
            <div className="flex gap-4 pt-1">
                <Link href="/cookies" className="text-[10px] font-bold text-white underline decoration-[#FDCB02] decoration-2 underline-offset-4 hover:text-[#FDCB02] transition-colors uppercase">
                    Leer Política
                </Link>
                <Link href="/privacy" className="text-[10px] font-bold text-neutral-500 hover:text-white transition-colors uppercase">
                    Privacidad
                </Link>
            </div>
          </div>

          {/* Botones */}
          <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
             <button 
                onClick={() => setIsVisible(false)}
                className="p-2 text-neutral-500 hover:text-white transition-colors md:hidden absolute top-2 right-2"
             >
                <X size={16} />
             </button>
             
             <button 
                onClick={acceptCookies}
                className="bg-[#FDCB02] hover:bg-white hover:scale-105 active:scale-95 text-black font-black uppercase text-xs px-6 py-3 rounded-lg transition-all shadow-[0_0_15px_rgba(253,203,2,0.2)] w-full md:w-auto whitespace-nowrap"
             >
                Aceptar Todo
             </button>
          </div>

        </div>
      </div>
    </div>
  );
}