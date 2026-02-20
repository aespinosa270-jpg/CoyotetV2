"use client"

import Link from "next/link"
import { 
  ShieldCheck, 
  Copyright,
  Box,
  FileText,
  ArrowUpRight,
  Lock
} from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-[#050505] text-white border-t border-white/10 font-sans relative overflow-hidden selection:bg-[#FDCB02] selection:text-black">
      
      {/* Textura de Fondo */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.04] pointer-events-none mix-blend-overlay" 
        style={{ backgroundImage: `url("https://grainy-gradients.vercel.app/noise.svg")` }} 
      />

      {/* 1. BARRA DE GARANTÍAS */}
      <div className="relative z-10 border-b border-white/10">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10">
            
            <div className="py-10 md:pr-10 group cursor-default">
               <div className="flex items-center gap-4 mb-3">
                 <div className="w-10 h-10 bg-[#111] text-[#FDCB02] flex items-center justify-center group-hover:bg-[#FDCB02] group-hover:text-black transition-colors duration-300 border border-white/10 rounded-sm">
                    <ShieldCheck size={18} />
                 </div>
                 <h4 className="font-[900] text-xs uppercase tracking-widest text-white">Calidad ISO-9001</h4>
               </div>
               <p className="text-[10px] font-mono text-neutral-500 leading-relaxed uppercase pl-[3.5rem]">
                 Inspección técnica de gramaje. Garantía de devolución de 15 días.
               </p>
            </div>

            <div className="py-10 md:px-10 group cursor-default">
               <div className="flex items-center gap-4 mb-3">
                 <div className="w-10 h-10 bg-[#111] text-[#FDCB02] flex items-center justify-center group-hover:bg-[#FDCB02] group-hover:text-black transition-colors duration-300 border border-white/10 rounded-sm">
                    <Box size={18} />
                 </div>
                 <h4 className="font-[900] text-xs uppercase tracking-widest text-white">Logística Nacional</h4>
               </div>
               <p className="text-[10px] font-mono text-neutral-500 leading-relaxed uppercase pl-[3.5rem]">
                 Envíos consolidados a todo México. Rastreo satelital 24/7.
               </p>
            </div>

            <div className="py-10 md:pl-10 group cursor-default">
               <div className="flex items-center gap-4 mb-3">
                 <div className="w-10 h-10 bg-[#111] text-[#FDCB02] flex items-center justify-center group-hover:bg-[#FDCB02] group-hover:text-black transition-colors duration-300 border border-white/10 rounded-sm">
                    <FileText size={18} />
                 </div>
                 <h4 className="font-[900] text-xs uppercase tracking-widest text-white">Facturación 4.0</h4>
               </div>
               <p className="text-[10px] font-mono text-neutral-500 leading-relaxed uppercase pl-[3.5rem]">
                 Emisión fiscal automática al confirmar compra. Precios netos.
               </p>
            </div>

          </div>
        </div>
      </div>

      {/* 2. GRID PRINCIPAL */}
      <div className="relative z-10 container mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
          
          {/* IDENTIDAD DE MARCA */}
          <div className="lg:col-span-5 flex flex-col justify-between h-full">
            <div>
              <h2 className="text-[12vw] lg:text-[5vw] leading-[0.8] font-[1000] tracking-tighter uppercase text-white mb-8">
                COYOTE<span className="text-[#FDCB02]">.</span>
              </h2>
              <div className="pl-6 border-l-2 border-[#FDCB02] space-y-6">
                  <p className="text-sm font-bold text-neutral-300 max-w-sm uppercase tracking-wide leading-relaxed">
                    Infraestructura digital para la cadena de suministro textil.
                  </p>
                  
                  {/* --- AQUÍ AGREGAMOS LOS LOGOS QUE FALTABAN --- */}
                  <div className="pt-4">
                    <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-3">
                        Pagos Procesados vía
                    </p>
                    {/* Contenedor con efecto Grayscale -> Color al Hover */}
                    <div className="flex flex-wrap items-center gap-5 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                        
                        {/* Logo OpenPay */}
                        <img 
                            src="https://raw.githubusercontent.com/open-pay/openpay-js/master/src/assets/openpay.png" 
                            alt="OpenPay" 
                            className="h-6 w-auto brightness-0 invert" 
                        />
                        
                        <div className="h-5 w-px bg-white/20"></div>

                        {/* Logos Tarjetas (Añadidos) */}
                        <div className="flex items-center gap-3">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4 w-auto brightness-0 invert" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-4 w-auto brightness-0 invert" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg" alt="Amex" className="h-4 w-auto brightness-0 invert" />
                        </div>

                        <div className="h-5 w-px bg-white/20"></div>

                        <div className="flex gap-1.5 text-white items-center">
                            <Lock size={12} />
                            <span className="text-[9px] font-bold uppercase">SSL 256-bit</span>
                        </div>
                    </div>
                  </div>
              </div>
            </div>
          </div>

          {/* MAPA DEL SITIO */}
          <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-12">
            <div className="space-y-8">
              <h4 className="font-[1000] text-[10px] text-[#FDCB02] uppercase tracking-[0.2em] border-b border-white/10 pb-4">
                Inventario
              </h4>
              <ul className="space-y-4">
                {["Dry-Fit Tech", "Piqué", "Gabardina", "Telas Técnicas", "Liquidación"].map((item) => (
                  <li key={item}>
                    <Link href="/catalogo" className="text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-white hover:pl-2 transition-all flex items-center gap-2 group">
                      <ArrowUpRight size={10} className="text-[#FDCB02] opacity-0 group-hover:opacity-100 transition-opacity" />
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-8">
              <h4 className="font-[1000] text-[10px] text-[#FDCB02] uppercase tracking-[0.2em] border-b border-white/10 pb-4">
                Legal
              </h4>
              <ul className="space-y-4">
                <li>
                    <Link href="/terms" className="text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-white hover:pl-2 transition-all flex items-center gap-2 group">
                      <ArrowUpRight size={10} className="text-[#FDCB02] opacity-0 group-hover:opacity-100 transition-opacity" />
                      Términos y Condiciones
                    </Link>
                </li>
                <li>
                    <Link href="/privacy" className="text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-white hover:pl-2 transition-all flex items-center gap-2 group">
                      <ArrowUpRight size={10} className="text-[#FDCB02] opacity-0 group-hover:opacity-100 transition-opacity" />
                      Aviso de Privacidad
                    </Link>
                </li>
                <li>
                    <Link href="/cookies" className="text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-white hover:pl-2 transition-all flex items-center gap-2 group">
                      <ArrowUpRight size={10} className="text-[#FDCB02] opacity-0 group-hover:opacity-100 transition-opacity" />
                      Política de Cookies
                    </Link>
                </li>
                {/* AÑADIDO: Transparencia fiscal para emitir CFDI y cumplimiento PROFECO */}
                <li>
                    <Link href="/facturacion" className="text-xs font-[1000] text-[#FDCB02] uppercase tracking-widest hover:text-white hover:pl-2 transition-all flex items-center gap-2 group mt-2">
                      <FileText size={10} className="text-[#FDCB02] opacity-0 group-hover:opacity-100 transition-opacity" />
                      Portal Facturación 4.0
                    </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-8">
              <h4 className="font-[1000] text-[10px] text-[#FDCB02] uppercase tracking-[0.2em] border-b border-white/10 pb-4">
                Datos de Contacto
              </h4>
              <ul className="space-y-6">
                <li>
                  <span className="block text-[9px] font-black text-neutral-600 mb-1.5 tracking-widest">LÍNEA CORPORATIVA</span>
                  <a href="tel:5555421527" className="text-xl font-[1000] text-white hover:text-[#FDCB02] transition-colors">
                    55 5542 1527
                  </a>
                </li>
                {/* AÑADIDO: Domicilio Fiscal con C.P. y RFC exigidos por el SAT */}
                <li>
                  <span className="block text-[9px] font-black text-neutral-600 mb-1.5 tracking-widest">DOMICILIO FISCAL & RFC</span>
                  <p className="text-xs font-bold text-neutral-300 leading-relaxed uppercase">
                    Coyote Textil.<br/>
                    República de Guatemala 97-A<br/>
                    Centro Histórico, CDMX, C.P. 06000
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BARRA LEGAL & COPYRIGHT */}
      <div className="relative z-10 border-t border-white/10 bg-[#020202]">
        <div className="container mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-6">
          
          <div className="flex flex-col md:flex-row items-center gap-8 w-full justify-between">
            <div className="flex items-center gap-2 text-[9px] font-mono text-neutral-600 uppercase font-bold tracking-widest">
              <Copyright size={10} />
              <span>2026 Coyote Textil</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 md:gap-8">
                <Link href="/terms" className="text-[9px] font-black uppercase tracking-widest text-neutral-500 hover:text-[#FDCB02] transition-colors">
                    Términos
                </Link>
                <Link href="/privacy" className="text-[9px] font-black uppercase tracking-widest text-neutral-500 hover:text-[#FDCB02] transition-colors">
                    Privacidad
                </Link>
                <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-green-800">
                    <Lock size={8} />
                    <span>Pagos Seguros</span>
                </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}