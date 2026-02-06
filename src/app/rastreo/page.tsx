"use client"

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, MapPin, Ship, Anchor, CheckCircle2, 
  Clock, AlertTriangle, Box, ArrowRight, Activity,
  Globe, Truck, FileText
} from "lucide-react";
import Image from "next/image";

// --- MOCK DATA (SIMULACIÓN DE API) ---
const MOCK_SHIPMENT = {
  id: "COYU-88291",
  origin: "Ningbo, CN",
  destination: "Manzanillo, MX",
  eta: "14 NOV 2024",
  status: "En Tránsito",
  progress: 65,
  vessel: "MSC GÜLSÜN",
  type: "40ft High Cube",
  weight: "26,500 kg",
  timeline: [
    { date: "01 NOV", title: "Booking Confirmado", location: "Ningbo", status: "completed", icon: FileText },
    { date: "03 NOV", title: "Contenedor Cargado", location: "Fábrica Tex", status: "completed", icon: Box },
    { date: "05 NOV", title: "Zarpe de Puerto", location: "Port of Ningbo", status: "completed", icon: Ship },
    { date: "Hoy", title: "En Altamar", location: "Océano Pacífico", status: "active", icon: Activity },
    { date: "12 NOV", title: "Arribo Estimado", location: "Manzanillo", status: "pending", icon: Anchor },
    { date: "14 NOV", title: "Despacho Aduanal", location: "Aduana MX", status: "pending", icon: CheckCircle2 },
    { date: "15 NOV", title: "Entrega Final", location: "Tu Bodega", status: "pending", icon: Truck },
  ]
};

const GlobalNoise = () => (
  <div className="fixed inset-0 z-[0] pointer-events-none opacity-[0.04] mix-blend-overlay bg-repeat"
       style={{ backgroundImage: `url("https://grainy-gradients.vercel.app/noise.svg")` }} />
);

export default function TrackingPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    
    setLoading(true);
    setResult(null);

    // Simular API delay
    setTimeout(() => {
      setLoading(false);
      setResult(MOCK_SHIPMENT);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-[#FDCB02] selection:text-black">
      <GlobalNoise />

      {/* --- BACKGROUND MAP (VISUAL) --- */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none grayscale contrast-125">
          <Image 
            src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop"
            alt="World Map"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[#030303]/80"/> 
      </div>

      <main className="relative z-10 container mx-auto px-6 py-20 min-h-screen flex flex-col">
          
          {/* HEADER */}
          <div className="max-w-3xl mx-auto w-full text-center mb-16">
              <div className="inline-flex items-center gap-2 text-[#FDCB02] mb-6 border border-[#FDCB02]/30 px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-md">
                  <Globe size={14} className="animate-pulse"/>
                  <span className="text-[10px] font-[900] uppercase tracking-[0.2em]">Coyote Global Logistics</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-[1000] uppercase tracking-tighter leading-none mb-6">
                  RASTREO <span className="text-transparent" style={{ WebkitTextStroke: '1px #fff' }}>SATELITAL</span>
              </h1>
              <p className="text-neutral-400 max-w-lg mx-auto font-medium text-sm">
                  Visibilidad total de tu cadena de suministro. Ingresa tu número de Master BL, Booking o ID de Contenedor.
              </p>
          </div>

          {/* SEARCH INPUT */}
          <div className="max-w-2xl mx-auto w-full mb-12">
              <form onSubmit={handleSearch} className="relative group">
                  <div className={`absolute -inset-1 bg-gradient-to-r from-[#FDCB02]/20 to-white/10 rounded-lg blur opacity-20 group-hover:opacity-50 transition duration-500 ${loading ? 'opacity-100 animate-pulse' : ''}`}></div>
                  <div className="relative bg-[#0a0a0a] border border-white/10 rounded-lg flex items-center p-2 shadow-2xl">
                      <div className="pl-4 pr-3 text-neutral-500">
                          <Search size={20}/>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Ej. COYU-88291 / MSKU928374" 
                        className="flex-1 bg-transparent h-12 text-lg font-bold uppercase placeholder:text-neutral-600 focus:outline-none text-white tracking-widest font-mono"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      <button 
                        type="submit"
                        disabled={loading}
                        className="bg-[#FDCB02] text-black px-8 h-12 rounded font-[900] uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          {loading ? 'Buscando...' : 'Rastrear'}
                      </button>
                  </div>
              </form>
          </div>

          {/* RESULTS DASHBOARD */}
          <AnimatePresence>
              {result && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="max-w-5xl mx-auto w-full"
                  >
                      {/* TOP CARDS */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                          
                          {/* STATUS CARD */}
                          <div className="bg-[#0a0a0a]/90 backdrop-blur-md border border-[#FDCB02] p-6 rounded-xl relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                                  <Activity size={40} className="text-[#FDCB02]"/>
                              </div>
                              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Estatus Actual</p>
                              <h3 className="text-2xl font-[1000] uppercase text-white mb-2">{result.status}</h3>
                              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-4">
                                  <div className="h-full bg-[#FDCB02] w-[65%] shadow-[0_0_10px_#FDCB02]"/>
                              </div>
                              <p className="text-[9px] text-[#FDCB02] font-mono mt-2 text-right">Progreso: {result.progress}%</p>
                          </div>

                          {/* ETA CARD */}
                          <div className="bg-[#0a0a0a]/90 backdrop-blur-md border border-white/10 p-6 rounded-xl hover:border-white/30 transition-colors">
                              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Estimado de Arribo (ETA)</p>
                              <h3 className="text-3xl font-[1000] uppercase text-white">{result.eta}</h3>
                              <p className="text-xs text-neutral-500 mt-2 font-medium">Destino: {result.destination}</p>
                          </div>

                          {/* INFO CARD */}
                          <div className="bg-[#0a0a0a]/90 backdrop-blur-md border border-white/10 p-6 rounded-xl hover:border-white/30 transition-colors">
                              <div className="space-y-3">
                                  <div className="flex justify-between border-b border-white/5 pb-2">
                                      <span className="text-[10px] text-neutral-500 uppercase">Buque</span>
                                      <span className="text-[10px] text-white font-bold uppercase">{result.vessel}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-white/5 pb-2">
                                      <span className="text-[10px] text-neutral-500 uppercase">Contenedor</span>
                                      <span className="text-[10px] text-white font-bold uppercase">{result.type}</span>
                                  </div>
                                  <div className="flex justify-between">
                                      <span className="text-[10px] text-neutral-500 uppercase">Peso</span>
                                      <span className="text-[10px] text-white font-bold uppercase">{result.weight}</span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* TIMELINE SECTION */}
                      <div className="bg-[#0a0a0a]/90 backdrop-blur-md border border-white/10 rounded-xl p-8">
                          <h3 className="text-lg font-[900] uppercase italic mb-8 flex items-center gap-2">
                              <Clock size={18} className="text-[#FDCB02]"/> Historial de Eventos
                          </h3>
                          
                          <div className="relative">
                              {/* Línea vertical conectora */}
                              <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-white/10 ml-[2.5px] md:ml-0 md:left-[140px]"/>

                              <div className="space-y-8">
                                  {result.timeline.map((event: any, i: number) => {
                                      const isCompleted = event.status === 'completed';
                                      const isActive = event.status === 'active';
                                      
                                      return (
                                          <div key={i} className={`relative flex flex-col md:flex-row gap-6 md:gap-10 group ${isActive ? 'opacity-100' : isCompleted ? 'opacity-70' : 'opacity-40'}`}>
                                              {/* FECHA (Desktop: Izquierda, Mobile: Arriba) */}
                                              <div className="hidden md:block w-24 text-right pt-1">
                                                  <span className={`block text-xs font-[900] ${isActive ? 'text-[#FDCB02]' : 'text-white'}`}>{event.date}</span>
                                                  <span className="block text-[9px] text-neutral-500 font-mono">{event.location}</span>
                                              </div>

                                              {/* ICONO CENTRAL */}
                                              <div className="relative z-10 flex items-start">
                                                  <div className={`
                                                      w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500
                                                      ${isActive 
                                                          ? 'bg-[#FDCB02] border-[#FDCB02] text-black scale-110 shadow-[0_0_20px_#FDCB02]' 
                                                          : isCompleted 
                                                              ? 'bg-black border-white text-white' 
                                                              : 'bg-black border-neutral-800 text-neutral-700'}
                                                  `}>
                                                      <event.icon size={18} strokeWidth={2.5} />
                                                  </div>
                                              </div>

                                              {/* DETALLE (Derecha) */}
                                              <div className="flex-1 pt-1 bg-[#111] md:bg-transparent p-4 md:p-0 rounded-lg md:rounded-none border border-white/5 md:border-none">
                                                  <div className="md:hidden mb-1 flex justify-between items-center">
                                                      <span className={`text-xs font-black ${isActive ? 'text-[#FDCB02]' : 'text-white'}`}>{event.date}</span>
                                                      <span className="text-[9px] text-neutral-500 font-mono">{event.location}</span>
                                                  </div>
                                                  <h4 className={`text-sm font-[900] uppercase ${isActive ? 'text-white' : 'text-neutral-300'}`}>{event.title}</h4>
                                                  <p className="text-[10px] text-neutral-500 mt-1">
                                                      {isActive ? 'Actualizado hace 2 horas vía Satélite.' : isCompleted ? 'Confirmado por Naviera.' : 'Pendiente.'}
                                                  </p>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      </div>

                  </motion.div>
              )}
          </AnimatePresence>

          {/* EMPTY STATE (DEFAULT) */}
          {!result && !loading && (
              <div className="max-w-4xl mx-auto w-full mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 opacity-40">
                  <div className="bg-[#111] p-4 rounded border border-white/5 text-center">
                      <Ship size={24} className="mx-auto mb-2 text-neutral-600"/>
                      <div className="text-2xl font-black text-neutral-700">120+</div>
                      <div className="text-[9px] font-bold uppercase text-neutral-500">Buques Monitoreados</div>
                  </div>
                  <div className="bg-[#111] p-4 rounded border border-white/5 text-center">
                      <Anchor size={24} className="mx-auto mb-2 text-neutral-600"/>
                      <div className="text-2xl font-black text-neutral-700">12</div>
                      <div className="text-[9px] font-bold uppercase text-neutral-500">Puertos Conectados</div>
                  </div>
                  <div className="bg-[#111] p-4 rounded border border-white/5 text-center">
                      <Box size={24} className="mx-auto mb-2 text-neutral-600"/>
                      <div className="text-2xl font-black text-neutral-700">24/7</div>
                      <div className="text-[9px] font-bold uppercase text-neutral-500">Soporte Aduanal</div>
                  </div>
                  <div className="bg-[#111] p-4 rounded border border-white/5 text-center">
                      <CheckCircle2 size={24} className="mx-auto mb-2 text-neutral-600"/>
                      <div className="text-2xl font-black text-neutral-700">99%</div>
                      <div className="text-[9px] font-bold uppercase text-neutral-500">Precisión GPS</div>
                  </div>
              </div>
          )}

      </main>
    </div>
  );
}