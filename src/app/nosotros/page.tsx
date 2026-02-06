"use client"

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { 
  Building2, Globe, Container, TrendingUp, 
  Anchor, ShieldCheck, ArrowDown, Zap, Target, Crown, Eye
} from "lucide-react";

// --- COMPONENTES UI ---

const GlobalNoise = () => (
  <div className="fixed inset-0 z-[0] pointer-events-none opacity-[0.04] mix-blend-overlay bg-repeat"
       style={{ backgroundImage: `url("https://grainy-gradients.vercel.app/noise.svg")` }} />
);

const SectionTitle = ({ children, subtitle, dark = false }: { children: React.ReactNode, subtitle: string, dark?: boolean }) => (
    <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
            <span className={`w-8 h-px ${dark ? 'bg-black' : 'bg-[#FDCB02]'}`}></span>
            <span className={`${dark ? 'text-black' : 'text-[#FDCB02]'} text-[10px] font-[900] uppercase tracking-[0.3em]`}>{subtitle}</span>
        </div>
        <h2 className={`text-4xl md:text-6xl font-[1000] uppercase tracking-tighter leading-[0.9] ${dark ? 'text-black' : 'text-white'}`}>
            {children}
        </h2>
    </div>
);

// --- PÁGINA PRINCIPAL ---
export default function AboutPage() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Parallax para el Hero
  const yHero = useTransform(scrollYProgress, [0, 0.2], ["0%", "50%"]);
  const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#020202] text-white font-sans selection:bg-[#FDCB02] selection:text-black overflow-x-hidden perspective-5000">
      <GlobalNoise />

      {/* --- 1. HERO SECTION --- */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
          <motion.div style={{ y: yHero }} className="absolute inset-0 z-0">
              <Image 
                src="/24.png" 
                alt="Coyote Infraestructura" 
                fill 
                className="object-cover object-center scale-105 opacity-60"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-[#020202] z-10"/>
          </motion.div>

          <motion.div 
            style={{ opacity: opacityHero }}
            className="relative z-20 container mx-auto px-6 text-center"
          >
              <div className="inline-flex items-center gap-2 border border-[#FDCB02]/30 bg-black/50 backdrop-blur-md px-5 py-2 rounded-full mb-8">
                  <Crown size={14} className="text-[#FDCB02]"/>
                  <span className="text-[10px] font-[900] uppercase tracking-[0.3em] text-[#FDCB02]">ADN INDUSTRIAL</span>
              </div>
              
              {/* CAMBIO APLICADO AQUÍ: TÍTULO SOBERANÍA */}
              <h1 className="text-5xl md:text-[8vw] font-[1000] uppercase leading-[0.85] tracking-tighter mb-8 text-white drop-shadow-2xl">
                  SOBERANÍA TEXTIL PARA<br/>
                  <span className="text-[#FDCB02]">CADA CONFECCIONISTA.</span>
              </h1>
              
              <p className="max-w-2xl mx-auto text-lg md:text-xl font-medium text-neutral-300 leading-relaxed font-mono uppercase tracking-wide">
                  Definiendo el estándar del abasto textil en México desde 2022.
              </p>
          </motion.div>
      </section>

      {/* --- 2. MISIÓN Y VISIÓN (DISEÑO CENTRADO Y SÓLIDO) --- */}
      <section className="py-24 bg-[#080808] border-y border-white/5 relative overflow-hidden">
          <div className="container mx-auto px-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
                  
                  {/* BLOQUE MISIÓN (CENTRADO) */}
                  <div className="group relative p-12 border border-white/10 bg-[#050505] hover:border-[#FDCB02]/50 transition-colors duration-500 flex flex-col items-center text-center">
                      
                      {/* Icono Emblema */}
                      <div className="mb-8 p-5 bg-white/5 rounded-full text-[#FDCB02] group-hover:bg-[#FDCB02] group-hover:text-black transition-all duration-300 shadow-[0_0_20px_rgba(253,203,2,0.1)]">
                          <Target size={40} strokeWidth={1.5}/>
                      </div>

                      <span className="text-[#FDCB02] font-[900] text-xs uppercase tracking-[0.3em] mb-4">
                          Nuestra Misión
                      </span>
                      
                      <h3 className="text-4xl md:text-5xl font-[1000] uppercase text-white leading-[0.9] mb-6 tracking-tight">
                          Democratizar el <br/>
                          <span className="text-[#FDCB02]">Acceso Industrial</span>
                      </h3>
                      
                      <div className="w-12 h-1 bg-[#FDCB02] mb-6 rounded-full"/>

                      <p className="text-neutral-400 text-lg leading-relaxed font-medium max-w-md">
                          Eliminar las barreras de importación para que cualquier confeccionista mexicano tenga acceso directo a insumos de calidad global (Rollos Cerrados y Kilos) a precios accecibles. Sin intermediarios abusivos.
                      </p>
                  </div>

                  {/* BLOQUE VISIÓN (CENTRADO) */}
                  <div className="group relative p-12 border border-white/10 bg-[#050505] hover:border-[#FDCB02]/50 transition-colors duration-500 flex flex-col items-center text-center">
                      
                      {/* Icono Emblema */}
                      <div className="mb-8 p-5 bg-white/5 rounded-full text-[#FDCB02] group-hover:bg-[#FDCB02] group-hover:text-black transition-all duration-300 shadow-[0_0_20px_rgba(253,203,2,0.1)]">
                          <Eye size={40} strokeWidth={1.5}/>
                      </div>

                      <span className="text-[#FDCB02] font-[900] text-xs uppercase tracking-[0.3em] mb-4">
                          Nuestra Visión
                      </span>
                      
                      <h3 className="text-4xl md:text-5xl font-[1000] uppercase text-white leading-[0.9] mb-6 tracking-tight">
                          Ser el Sistema Operativo <br/>
                          <span className="text-[#FDCB02]">Textil de México</span>
                      </h3>

                      <div className="w-12 h-1 bg-[#FDCB02] mb-6 rounded-full"/>

                      <p className="text-neutral-400 text-lg leading-relaxed font-medium max-w-md">
                          Convertirnos en la infraestructura digital y física definitiva sobre la cual se construye la industria de la moda en el país. Donde Coyote sea sinónimo de certeza, volumen y potencia.
                      </p>
                  </div>

              </div>
          </div>
      </section>

      {/* --- 3. LOGÍSTICA GLOBAL --- */}
      <section className="py-32 bg-[#020202] relative overflow-hidden">
          <div className="container mx-auto px-6">
              <div className="flex flex-col lg:flex-row-reverse gap-24 items-center">
                  
                  {/* Texto */}
                  <div className="flex-1">
                      <SectionTitle subtitle="Alcance Sin Límites">
                          TU PUENTE <br/>
                          <span className="text-[#FDCB02]">DIRECTO A ASIA.</span>
                      </SectionTitle>
                      
                      <p className="text-neutral-400 text-lg mb-12 leading-relaxed font-medium">
                        Nuestra red de agentes en Ningbo y Shanghái gestiona tu producción en origen, asegurando el peso y la calidad de cada rollo antes de que zarpe el barco.
                      </p>
                      
                      <ul className="space-y-8">
                          {[
                              { title: "Booking Prioritario", desc: "Espacios garantizados en buques incluso en temporada alta.", icon: Anchor },
                              { title: "Stock Flotante", desc: "Siempre tenemos Toneladas navegando hacia México.", icon: Container },
                              { title: "Aduana Express", desc: "Liberación en Manzanillo en tiempo récord.", icon: ShieldCheck }
                          ].map((item, i) => (
                              <div key={i} className="flex items-start gap-5 group">
                                  <div className="w-14 h-14 bg-[#111] border border-white/10 rounded-sm flex items-center justify-center group-hover:bg-[#FDCB02] group-hover:text-black transition-all duration-300 shrink-0">
                                      <item.icon size={24} strokeWidth={2}/>
                                  </div>
                                  <div>
                                      <h4 className="text-white font-[900] uppercase text-lg mb-1 group-hover:text-[#FDCB02] transition-colors">{item.title}</h4>
                                      <p className="text-neutral-500 text-sm leading-relaxed font-mono uppercase">{item.desc}</p>
                                  </div>
                              </div>
                          ))}
                      </ul>
                  </div>

                  {/* Imagen T3 */}
                  <div className="flex-1 relative w-full h-[600px]">
                      {/* Marco Decorativo */}
                      <div className="absolute inset-0 border-2 border-[#FDCB02] transform translate-x-4 translate-y-4 -z-10"/>
                      
                      <div className="absolute inset-0 bg-[#0a0a0a] border border-white/10">
                          <Image 
                            src="/22.png" 
                            alt="Logística Global" 
                            fill 
                            className="object-cover opacity-80 hover:opacity-100 transition-opacity duration-500 grayscale hover:grayscale-0"
                          />
                          
                          <div className="absolute bottom-8 left-8 bg-black/80 backdrop-blur border-l-4 border-[#FDCB02] p-6">
                               <h3 className="text-4xl font-[1000] text-white uppercase leading-none mb-2">
                                   Ningbo <span className="text-[#FDCB02]">➔</span> Manzanillo
                               </h3>
                               <p className="text-neutral-400 font-mono uppercase text-sm tracking-widest">Ruta Transpacífica Express</p>
                          </div>
                      </div>
                  </div>

              </div>
          </div>
      </section>

      {/* --- 4. DATA FOOTER (STATS ACTUALIZADOS) --- */}
      <section className="py-32 container mx-auto px-6 border-t border-white/5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              {[
                  { label: "Años Operando", val: "4+" },
                  { label: "Socios Activos", val: "3,727+" },
                  { label: "Contenedores / Año", val: "63+" },
                  { label: "Toneladas Vendidas Por Año", val: "1.5k+" },
              ].map((stat, i) => (
                  <div key={i} className="relative p-10 bg-[#0a0a0a] border border-white/10 overflow-hidden group hover:border-[#FDCB02] transition-colors duration-300 flex flex-col items-center text-center">
                      <div className="text-6xl md:text-7xl font-[1000] text-white mb-4 group-hover:text-[#FDCB02] transition-colors leading-none">
                          {stat.val}
                      </div>
                      <div className="text-xs font-black uppercase tracking-[0.25em] text-neutral-500 border-t border-white/10 pt-4 w-full group-hover:text-white transition-colors font-mono">
                          {stat.label}
                      </div>
                  </div>
              ))}
          </div>
      </section>

    </div>
  );
}