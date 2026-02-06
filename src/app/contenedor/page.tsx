"use client"

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Ship, Container, Check, 
  Anchor, Calendar, TrendingDown, Info, 
  Box, ArrowRight 
} from "lucide-react";

// --- DATOS DE FIBRAS ---
const FABRICS = [
  { id: 'dryfit', name: 'Dry-Fit Tech', code: 'DFT-01', density: '180gsm' },
  { id: 'pique', name: 'Piqué Sport', code: 'PQS-02', density: '220gsm' },
  { id: 'mezclilla', name: 'Mezclilla Ind.', code: 'MZC-03', density: '12oz' },
  { id: 'brush', name: 'Brush Premium', code: 'BRP-04', density: '160gsm' },
];

// --- TIPOS DE CONTENEDOR ---
const CONTAINERS = [
  { 
    id: '20ft', 
    name: '20ft Standard', 
    capacity: 6000, 
    desc: 'Ideal para pymes. ~250 Rollos.',
    price_est: 'FOB Shanghái'
  },
  { 
    id: '40ft', 
    name: '40ft High Cube', 
    capacity: 14000, 
    desc: 'Máxima rentabilidad. ~600 Rollos.',
    price_est: 'Mejor Costo/Kg'
  }
];

const GlobalNoise = () => (
  <div className="fixed inset-0 z-[0] pointer-events-none opacity-[0.04] mix-blend-overlay bg-repeat"
       style={{ backgroundImage: `url("https://grainy-gradients.vercel.app/noise.svg")` }} />
);

export default function ContenedorPage() {
  const [step, setStep] = useState(1);
  const [selectedFabric, setSelectedFabric] = useState<any>(null);
  const [selectedContainer, setSelectedContainer] = useState<any>(null);
  const [loadWeight, setLoadWeight] = useState(0); 
  
  // Calcular porcentaje de carga visual
  const loadPercentage = selectedContainer ? Math.min(100, Math.round((loadWeight / selectedContainer.capacity) * 100)) : 0;

  // --- CONTROL DEL WIZARD ---
  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-[#FDCB02] selection:text-black pb-20">
      <GlobalNoise />

      {/* --- HERO HEADER --- */}
      <section className="relative pt-32 pb-12 border-b border-white/10 bg-[#050505]">
          <div className="container mx-auto px-6 relative z-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                      <div className="inline-flex items-center gap-2 text-[#FDCB02] mb-4 border border-[#FDCB02]/30 px-3 py-1 rounded-full bg-[#FDCB02]/5">
                          <Ship size={14} className="animate-pulse"/>
                          <span className="text-[10px] font-[900] uppercase tracking-widest">División Logística Global</span>
                      </div>
                      <h1 className="text-5xl md:text-7xl font-[1000] uppercase leading-[0.9] tracking-tighter mb-2">
                          PROGRAMA <br/><span className="text-transparent" style={{ WebkitTextStroke: '1px #fff' }}>TU CONTENEDOR</span>
                      </h1>
                      <p className="text-neutral-400 font-mono text-xs md:text-sm max-w-xl">
                          Gestión directa Factory-to-Door. Sin intermediarios locales. Ahorra hasta un 35% importando tu propio stock.
                      </p>
                  </div>
                  
                  {/* ESTADO DE COTIZACIÓN */}
                  <div className="bg-[#111] border border-white/10 p-6 rounded-xl w-full md:w-80 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#FDCB02]"/>
                      <div className="flex justify-between items-center mb-4">
                          <span className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Estado de Carga</span>
                          <span className="text-[#FDCB02] font-mono text-xs">{loadPercentage}% LLENO</span>
                      </div>
                      {/* Barra de Progreso */}
                      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden mb-2">
                          <motion.div 
                            className="h-full bg-[#FDCB02]" 
                            initial={{ width: 0 }} 
                            animate={{ width: `${loadPercentage}%` }}
                            transition={{ type: "spring", stiffness: 50 }}
                          />
                      </div>
                      <p className="text-[9px] text-neutral-600 font-mono text-right uppercase">
                          {selectedContainer ? `${loadWeight}kg / ${selectedContainer.capacity}kg` : 'Selecciona Contenedor'}
                      </p>
                  </div>
              </div>
          </div>
      </section>

      {/* --- WIZARD INTERFACE --- */}
      <main className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              
              {/* IZQUIERDA: CONFIGURADOR (8 Cols) */}
              <div className="lg:col-span-8">
                  
                  {/* STEPPER INDICATOR */}
                  <div className="flex items-center gap-4 mb-12 overflow-x-auto pb-4 scrollbar-hide">
                      {[1, 2, 3, 4].map((s) => (
                          <div key={s} className="flex items-center gap-3 min-w-max">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border transition-colors ${step === s ? 'bg-[#FDCB02] text-black border-[#FDCB02]' : step > s ? 'bg-white text-black border-white' : 'bg-transparent text-neutral-600 border-neutral-800'}`}>
                                  {step > s ? <Check size={14}/> : s}
                              </div>
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${step === s ? 'text-white' : 'text-neutral-600'}`}>
                                  {s === 1 ? 'Selección Fibra' : s === 2 ? 'Tipo Contenedor' : s === 3 ? 'Distribución' : 'Resumen'}
                              </span>
                              {s < 4 && <div className="w-8 h-px bg-white/10"/>}
                          </div>
                      ))}
                  </div>

                  <div className="min-h-[400px]">
                      <AnimatePresence mode="wait">
                          
                          {/* PASO 1: SELECCIONAR FIBRA */}
                          {step === 1 && (
                              <motion.div 
                                key="step1"
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                              >
                                  <h2 className="text-2xl font-[1000] uppercase italic mb-6">1. Selecciona la Fibra Base</h2>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {FABRICS.map((fabric) => (
                                          <div 
                                            key={fabric.id}
                                            onClick={() => setSelectedFabric(fabric)}
                                            className={`
                                                cursor-pointer p-4 border rounded-xl flex gap-4 transition-all hover:bg-[#111] group
                                                ${selectedFabric?.id === fabric.id ? 'border-[#FDCB02] bg-[#111]' : 'border-white/10 bg-[#0a0a0a]'}
                                            `}
                                          >
                                              <div className="w-20 h-20 bg-neutral-800 rounded-lg overflow-hidden relative flex items-center justify-center">
                                                  <span className="text-neutral-600 text-xs font-bold">IMG</span>
                                              </div>
                                              <div className="flex-1 flex flex-col justify-center">
                                                  <h3 className={`text-lg font-[900] uppercase mb-1 ${selectedFabric?.id === fabric.id ? 'text-[#FDCB02]' : 'text-white'}`}>{fabric.name}</h3>
                                                  <div className="flex gap-3 text-[10px] font-mono text-neutral-400">
                                                      <span className="bg-white/5 px-2 py-0.5 rounded">{fabric.code}</span>
                                                      <span className="bg-white/5 px-2 py-0.5 rounded">{fabric.density}</span>
                                                  </div>
                                              </div>
                                              <div className={`w-6 h-6 rounded-full border flex items-center justify-center self-center ${selectedFabric?.id === fabric.id ? 'border-[#FDCB02] bg-[#FDCB02]' : 'border-white/20'}`}>
                                                  {selectedFabric?.id === fabric.id && <Check size={14} className="text-black"/>}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </motion.div>
                          )}

                          {/* PASO 2: TIPO CONTENEDOR */}
                          {step === 2 && (
                              <motion.div 
                                key="step2"
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                              >
                                  <h2 className="text-2xl font-[1000] uppercase italic mb-6">2. Tamaño del Envío</h2>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {CONTAINERS.map((cont) => (
                                          <div 
                                            key={cont.id}
                                            onClick={() => { setSelectedContainer(cont); setLoadWeight(cont.capacity); }} 
                                            className={`
                                                relative p-8 border-2 rounded-2xl cursor-pointer transition-all overflow-hidden group
                                                ${selectedContainer?.id === cont.id ? 'border-[#FDCB02] bg-[#111]' : 'border-white/10 bg-[#050505] hover:border-white/30'}
                                            `}
                                          >
                                              <Container size={48} className={`mb-6 ${selectedContainer?.id === cont.id ? 'text-[#FDCB02]' : 'text-neutral-600'}`}/>
                                              <h3 className="text-2xl font-[1000] uppercase mb-2">{cont.name}</h3>
                                              <p className="text-sm text-neutral-400 font-medium mb-6">{cont.desc}</p>
                                              
                                              <div className="bg-white/5 rounded p-4 font-mono text-xs space-y-2">
                                                  <div className="flex justify-between">
                                                      <span className="text-neutral-500">Capacidad:</span>
                                                      <span className="text-white font-bold">{cont.capacity.toLocaleString()} kg</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                      <span className="text-neutral-500">Incoterm:</span>
                                                      <span className="text-white font-bold">{cont.price_est}</span>
                                                  </div>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </motion.div>
                          )}

                          {/* PASO 3: DISTRIBUCIÓN (SIMULADOR) */}
                          {step === 3 && (
                              <motion.div 
                                key="step3"
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                              >
                                  <h2 className="text-2xl font-[1000] uppercase italic mb-2">3. Distribución de Color</h2>
                                  <p className="text-neutral-400 text-sm mb-8">Ajusta los kilos por color. Tienes <strong>{selectedContainer?.capacity.toLocaleString()} kg</strong> disponibles.</p>
                                  
                                  <div className="space-y-6 bg-[#111] p-6 rounded-xl border border-white/10">
                                      <div className="flex items-center gap-4">
                                          <div className="w-8 h-8 bg-black border border-white/20 rounded-full"/>
                                          <div className="flex-1">
                                              <div className="flex justify-between mb-2">
                                                  <span className="text-xs font-bold uppercase">Negro Deep</span>
                                                  <span className="font-mono text-xs text-[#FDCB02]">{(loadWeight * 0.5).toFixed(0)} kg</span>
                                              </div>
                                              <input type="range" className="w-full accent-[#FDCB02] bg-neutral-800 h-2 rounded-lg appearance-none cursor-pointer" readOnly value={50}/>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                          <div className="w-8 h-8 bg-white border border-white/20 rounded-full"/>
                                          <div className="flex-1">
                                              <div className="flex justify-between mb-2">
                                                  <span className="text-xs font-bold uppercase">Blanco Óptico</span>
                                                  <span className="font-mono text-xs text-[#FDCB02]">{(loadWeight * 0.3).toFixed(0)} kg</span>
                                              </div>
                                              <input type="range" className="w-full accent-[#FDCB02] bg-neutral-800 h-2 rounded-lg appearance-none cursor-pointer" readOnly value={30} />
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                          <div className="w-8 h-8 bg-blue-900 border border-white/20 rounded-full"/>
                                          <div className="flex-1">
                                              <div className="flex justify-between mb-2">
                                                  <span className="text-xs font-bold uppercase">Marino</span>
                                                  <span className="font-mono text-xs text-[#FDCB02]">{(loadWeight * 0.2).toFixed(0)} kg</span>
                                              </div>
                                              <input type="range" className="w-full accent-[#FDCB02] bg-neutral-800 h-2 rounded-lg appearance-none cursor-pointer" readOnly value={20} />
                                          </div>
                                      </div>
                                  </div>
                              </motion.div>
                          )}

                          {/* PASO 4: RESUMEN FINAL */}
                          {step === 4 && (
                              <motion.div 
                                key="step4"
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                className="bg-[#111] border border-[#FDCB02] rounded-2xl p-8 text-center"
                              >
                                  <div className="w-20 h-20 bg-[#FDCB02]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                      <Anchor size={40} className="text-[#FDCB02]"/>
                                  </div>
                                  <h2 className="text-3xl font-[1000] uppercase italic text-white mb-4">¡Solicitud Lista!</h2>
                                  <p className="text-neutral-400 max-w-md mx-auto mb-8">
                                      Hemos generado el manifiesto de carga preliminar. Un agente aduanal de Coyote te contactará en menos de 2 horas para confirmar precio CIF y fecha de zarpe.
                                  </p>
                                  <div className="flex flex-col gap-3 max-w-xs mx-auto">
                                      <button className="w-full py-4 bg-[#FDCB02] text-black font-[900] uppercase tracking-widest rounded hover:bg-white transition-colors">
                                          Enviar Solicitud
                                      </button>
                                      <button className="w-full py-4 border border-white/10 text-neutral-400 font-bold uppercase tracking-widest rounded hover:text-white transition-colors text-[10px]">
                                          Descargar PDF Proforma
                                      </button>
                                  </div>
                              </motion.div>
                          )}

                      </AnimatePresence>
                  </div>

                  {/* NAVEGACIÓN INFERIOR */}
                  {step < 4 && (
                      <div className="flex justify-between mt-12 pt-8 border-t border-white/10">
                          <button 
                            onClick={prevStep} 
                            disabled={step === 1}
                            className="px-8 py-3 text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                              Atrás
                          </button>
                          <button 
                            onClick={nextStep}
                            disabled={!selectedFabric && step === 1 || !selectedContainer && step === 2}
                            className="bg-white text-black px-8 py-3 text-xs font-[900] uppercase tracking-widest hover:bg-[#FDCB02] transition-colors disabled:opacity-50 disabled:bg-neutral-800 disabled:text-neutral-500 rounded-sm flex items-center gap-2"
                          >
                              Siguiente <ArrowRight size={14}/>
                          </button>
                      </div>
                  )}

              </div>

              {/* DERECHA: MANIFIESTO EN VIVO (STICKY) */}
              <div className="lg:col-span-4">
                  <div className="sticky top-32 bg-[#0a0a0a] border border-white/10 rounded-xl p-6">
                      <h3 className="font-[900] uppercase text-sm mb-6 flex items-center gap-2">
                          <Box size={16} className="text-[#FDCB02]"/> Manifiesto de Carga
                      </h3>

                      <div className="space-y-4 mb-8">
                          <div className="flex justify-between items-center py-3 border-b border-white/5">
                              <span className="text-xs text-neutral-500 font-mono uppercase">Producto</span>
                              <span className="text-sm font-bold text-white uppercase">{selectedFabric?.name || "---"}</span>
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-white/5">
                              <span className="text-xs text-neutral-500 font-mono uppercase">Contenedor</span>
                              <span className="text-sm font-bold text-white uppercase">{selectedContainer?.name || "---"}</span>
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-white/5">
                              <span className="text-xs text-neutral-500 font-mono uppercase">Volumen</span>
                              <span className="text-sm font-bold text-[#FDCB02] uppercase">{loadWeight > 0 ? `${loadWeight.toLocaleString()} KG` : "---"}</span>
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-white/5">
                              <span className="text-xs text-neutral-500 font-mono uppercase">Tiempo Estimado</span>
                              <span className="text-xs font-mono text-white uppercase flex items-center gap-1"><Calendar size={12}/> 45-60 Días</span>
                          </div>
                      </div>

                      {/* Ahorro Proyectado */}
                      <div className="bg-[#111] rounded p-4 border border-white/5 mb-6">
                          <div className="flex items-start gap-3">
                              <TrendingDown className="text-green-500 mt-0.5" size={16}/>
                              <div>
                                  <p className="text-[10px] text-neutral-400 uppercase font-bold">Ahorro vs Compra Local</p>
                                  <p className="text-xl font-[1000] text-white">~35%</p>
                                  <p className="text-[9px] text-neutral-600 leading-tight mt-1">Calculado sobre precio de lista menudeo nacional.</p>
                              </div>
                          </div>
                      </div>

                      <div className="flex gap-2 items-start text-[9px] text-neutral-500 font-mono bg-blue-900/10 p-3 rounded border border-blue-900/30">
                          <Info size={14} className="text-blue-500 shrink-0"/>
                          <p>Este configurador genera una orden de compra preliminar (Proforma). No se realiza ningún cobro automático.</p>
                      </div>
                  </div>
              </div>

          </div>
      </main>
    </div>
  );
}