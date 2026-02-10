'use client';

import React, { useState } from 'react';
import { Truck, Search, PackageCheck, Map, ArrowRight } from 'lucide-react';

export default function RastreoPage() {
  const [trackingNumber, setTrackingNumber] = useState('');

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;

    // Redirección directa al sistema de rastreo de Skydropx
    // Esta es la forma más robusta de "integrar" el rastreo sin backend complejo
    const skydropxUrl = `https://www.skydropx.com/cards/tracking?tracking_number=${trackingNumber.trim()}`;
    window.open(skydropxUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans pb-20">
      
      {/* HEADER TIPO DASHBOARD */}
      <div className="bg-neutral-50 border-b border-neutral-200 py-16 px-6">
        <div className="container mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 bg-[#FDCB02] text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
                <Truck size={12} /> Logística Powered by Skydropx
            </div>
            <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter text-black mb-4">
              Rastreo Satelital
            </h1>
            <p className="text-neutral-500 text-lg max-w-2xl mx-auto">
              Monitorea el estatus de tu entrega en tiempo real. Ingresa tu número de guía (proveído en tu confirmación de compra).
            </p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-6 -mt-10 relative z-10">
        
        {/* TARJETA DE RASTREO */}
        <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 p-8 md:p-12">
            <form onSubmit={handleTrack} className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Ej. 1234567890 (Número de Guía)"
                        className="w-full bg-neutral-50 border border-neutral-200 pl-12 pr-4 py-4 rounded-xl text-lg font-bold uppercase focus:ring-2 focus:ring-[#FDCB02] focus:border-transparent outline-none transition-all placeholder:normal-case"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                    />
                </div>
                <button 
                    type="submit"
                    className="bg-black text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-[#FDCB02] hover:text-black transition-all flex items-center justify-center gap-2 group shadow-lg"
                >
                    Localizar <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 pt-12 border-t border-neutral-100">
                <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400">
                        <PackageCheck size={24} />
                    </div>
                    <h3 className="font-bold uppercase text-sm">Preparación</h3>
                    <p className="text-xs text-neutral-500">Tu pedido es recolectado en nuestra bodega central en CDMX.</p>
                </div>
                <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400">
                        <Truck size={24} />
                    </div>
                    <h3 className="font-bold uppercase text-sm">En Tránsito</h3>
                    <p className="text-xs text-neutral-500">La paquetería (FedEx, DHL, Estafeta) transporta tu paquete.</p>
                </div>
                <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400">
                        <Map size={24} />
                    </div>
                    <h3 className="font-bold uppercase text-sm">Entrega</h3>
                    <p className="text-xs text-neutral-500">Llegada a tu domicilio. Se requiere firma de recibido.</p>
                </div>
            </div>
        </div>

        {/* LOGOS DE PAQUETERIAS */}
        <div className="mt-16 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400 mb-6">
                Red Logística Integrada
            </p>
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Skydropx_logo.svg/2560px-Skydropx_logo.svg.png" alt="Skydropx" className="h-6 w-auto object-contain"/>
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/FedEx_Logo_black.svg/1200px-FedEx_Logo_black.svg.png" alt="FedEx" className="h-6 w-auto object-contain"/>
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/DHL_Logo.svg/2560px-DHL_Logo.svg.png" alt="DHL" className="h-6 w-auto object-contain"/>
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Estafeta_Mexicana.svg/2560px-Estafeta_Mexicana.svg.png" alt="Estafeta" className="h-6 w-auto object-contain"/>
            </div>
        </div>

      </div>
    </div>
  );
}