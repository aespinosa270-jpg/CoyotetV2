"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useCart } from "@/lib/context/cart-context" 
import { useAuth } from "@/lib/context/auth-context" 
import { products } from "@/lib/products"
import { 
  ShoppingCart, Search, User, Menu, X,
  ChevronDown, HelpCircle, FileText, Sparkles,
  Crown, Ship, Building2, Package, Truck, ArrowRight
} from "lucide-react"

export default function Navbar() {
  const { totalItems, openCart } = useCart()
  const { user, logout } = useAuth()
  
  const [searchMode, setSearchMode] = useState<'sku' | 'ia'>('sku')
  
  // Estado para el menú DESKTOP (Hover)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  // Estado para el menú MÓVIL (Hamburguesa)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // CAMBIO: Definimos las categorías manualmente según tu solicitud
  const categories = [
    "Telas Deportivas",
    "Telas para Sublimar",
    "Telas Escolares",
    "Telas Nacionales"
  ];

  // Bloquear scroll en móvil
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [mobileMenuOpen]);

  return (
    <>
      <nav className="sticky top-0 z-[100] w-full flex flex-col bg-[#050505] border-b border-white/10 font-sans selection:bg-[#FDCB02] selection:text-black transition-all">
        
        {/* ==================================================================================
            1. BARRA SUPERIOR (Utility Bar)
           ================================================================================== */}
        <div className="bg-[#020202] h-9 hidden lg:flex items-center border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
          <div className="max-w-[1920px] mx-auto w-full px-6 flex justify-between items-center">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2 text-[#FDCB02]">
                 <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"/>
                 Sistema: En Línea
              </span>
              <span className="w-px h-3 bg-white/10"/>
              <Link href="/rastreo" className="hover:text-white transition-colors flex items-center gap-2">
                <Truck size={11} /> Rastrear Envío
              </Link>
            </div>
            <div className="flex items-center gap-6">
              <a href="https://wa.me/5215555421527" target="_blank" className="hover:text-white transition-colors flex items-center gap-2">
                <HelpCircle size={11} /> Soporte Técnico
              </a>
              <Link href="/facturacion" className="hover:text-white transition-colors flex items-center gap-2 text-white">
                <FileText size={11} /> Facturación 4.0
              </Link>
            </div>
          </div>
        </div>

        {/* ==================================================================================
            2. HEADER PRINCIPAL (Logo, Search, Cart)
           ================================================================================== */}
        <div className="max-w-[1920px] mx-auto w-full px-4 lg:px-6 py-4 lg:py-5 flex items-center justify-between gap-4 lg:gap-12 relative bg-[#050505]">
          
          {/* Botón Hamburguesa (Móvil) */}
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden text-white p-2 -ml-2 hover:bg-white/10 rounded-md active:scale-95 transition-transform"
          >
            <Menu size={24} />
          </button>

          {/* Logo */}
          <Link href="/" className="shrink-0 relative z-10 group flex items-center gap-3 lg:gap-5">
              <div className="relative h-10 w-10 lg:h-20 lg:w-20 flex items-center justify-center">
                  <Image src="/coyotelogo.svg" alt="Coyote" fill className="object-contain" priority />
              </div>
              <div className="flex flex-col justify-center border-l-2 border-white/10 pl-3 lg:pl-5 py-1">
                  <h1 className="text-2xl lg:text-5xl font-[1000] text-[#FDCB02] uppercase leading-[0.8] tracking-[-0.06em] italic">COYOTE</h1>
                  <h2 className="text-[10px] lg:text-[14px] font-[900] text-white uppercase leading-none tracking-[0.25em] lg:tracking-[0.45em] mt-1 lg:mt-1.5 ml-0.5">TEXTIL</h2>
              </div>
          </Link>

          {/* Buscador (Desktop) */}
          <div className="flex-1 hidden lg:flex max-w-2xl relative z-20">
              <form className="w-full flex h-[52px] bg-[#111] border border-white/10 rounded-sm focus-within:border-[#FDCB02] focus-within:ring-1 focus-within:ring-[#FDCB02] transition-all overflow-hidden">
                  <div className="flex items-center px-5 bg-[#1a1a1a] border-r border-white/10 cursor-pointer hover:bg-[#222]" onClick={() => setSearchMode(searchMode === 'sku' ? 'ia' : 'sku')}>
                      <span className="text-[10px] font-[1000] uppercase text-neutral-400 w-16 text-center">{searchMode === 'sku' ? 'SKU' : 'IA'}</span>
                      <ChevronDown size={12} className="text-neutral-600 ml-1"/>
                  </div>
                  <input type="text" placeholder={searchMode === 'ia' ? "Describe tu necesidad..." : "BUSCAR REFERENCIA..."} className="flex-1 bg-transparent px-6 text-[13px] font-bold text-white placeholder:text-neutral-700 focus:outline-none uppercase tracking-wider"/>
                  <button className="bg-[#FDCB02] hover:bg-[#ffe159] text-black px-7 flex items-center justify-center"><Search size={22} strokeWidth={3}/></button>
              </form>
          </div>

          {/* User & Cart */}
          <div className="flex items-center gap-4 lg:gap-8 text-white ml-auto lg:ml-0">
            <div className="hidden lg:flex items-center gap-4 cursor-pointer">
              {user ? (
                 <div className="flex items-center gap-4" onClick={logout}>
                    <div className="text-right">
                        <span className="text-[9px] text-neutral-500 font-black block">HOLA</span>
                        <span className="text-[11px] font-bold uppercase">{user.name.split(' ')[0]}</span>
                    </div>
                    <div className="w-10 h-10 bg-[#FDCB02] text-black font-black flex items-center justify-center rounded-sm">
                        {user.name.charAt(0)}
                    </div>
                 </div>
              ) : (
                <Link href="/cuenta" className="flex flex-col text-right group">
                    <span className="text-[9px] text-neutral-500 font-black uppercase mb-1 group-hover:text-white">Acceso</span>
                    <span className="text-[11px] font-[1000] text-white uppercase flex items-center gap-2 group-hover:text-[#FDCB02]">
                        INGRESAR <User size={15} strokeWidth={3}/>
                    </span>
                </Link>
              )}
            </div>

            <button onClick={openCart} className="flex items-center gap-3 lg:gap-5 bg-white text-black pl-4 lg:pl-6 pr-4 lg:pr-8 py-2 lg:py-3.5 hover:bg-[#FDCB02] transition-all relative group rounded-sm shadow-xl">
              <div className="relative">
                <ShoppingCart size={20} strokeWidth={3} className="lg:w-[22px] lg:h-[22px]"/>
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 lg:-top-3 lg:-right-3 bg-red-600 text-white text-[9px] lg:text-[10px] font-black h-4 w-4 lg:h-5 lg:w-5 flex items-center justify-center rounded-full border-2 border-white">
                    {totalItems}
                  </span>
                )}
              </div>
              <div className="hidden lg:flex flex-col text-left leading-none border-l border-black/15 pl-5 ml-1">
                  <span className="font-[1000] text-[12px] uppercase tracking-widest">PEDIDO</span>
                  <span className="text-[10px] font-mono text-neutral-500 font-bold mt-1 uppercase">Activo</span>
              </div>
            </button>
          </div>
        </div>

        {/* ==================================================================================
            3. NAVEGACIÓN INFERIOR (Solo Desktop - MEGA MENU RESTAURADO)
           ================================================================================== */}
        <div className="hidden lg:block border-t border-white/5 bg-[#080808] h-14 relative">
          <div className="max-w-[1920px] mx-auto w-full px-6 h-full flex items-center gap-12">
              
              {/* TRIGGER DEL MENÚ DESPLEGABLE */}
              <div 
                className="relative h-full"
                onMouseEnter={() => setIsMenuOpen(true)}
                onMouseLeave={() => setIsMenuOpen(false)}
              >
                  <button className="flex items-center gap-4 h-full px-6 bg-white/5 hover:bg-[#FDCB02] hover:text-black transition-colors text-[11px] font-[1000] uppercase tracking-[0.25em] text-white border-r border-white/5 cursor-pointer">
                      <Menu size={18} strokeWidth={3}/> <span className="mt-0.5">Todos Nuestros Productos</span>
                  </button>

                  {/* EL DROPDOWN (Categorías Nuevas) */}
                  <div className={`absolute top-full left-0 w-[300px] bg-[#0a0a0a] border border-white/10 shadow-2xl transition-all duration-200 origin-top-left z-50 ${isMenuOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}`}>
                      <div className="py-2">
                          {categories.map((category) => (
                              <Link 
                                key={category} 
                                href={`/catalogo?categoria=${encodeURIComponent(category)}`} 
                                className="flex items-center gap-3 px-6 py-3 text-[11px] font-bold text-neutral-400 hover:text-white hover:bg-white/5 uppercase tracking-widest border-b border-white/5 last:border-0 transition-colors"
                              >
                                  <Package size={14} className="text-[#FDCB02]"/>{category}
                              </Link>
                          ))}
                          <Link 
                            href="/catalogo" 
                            className="flex items-center gap-3 px-6 py-4 text-[11px] font-[1000] text-[#FDCB02] hover:bg-[#FDCB02] hover:text-black uppercase tracking-widest transition-colors mt-1"
                          >
                              Ver Todo el Inventario &rarr;
                          </Link>
                      </div>
                  </div>
              </div>

              {/* Enlaces de Navegación */}
              <nav className="flex gap-12 text-[11px] font-[1000] uppercase tracking-[0.2em] text-neutral-500 h-full items-center">
                  <Link href="/nosotros" className="hover:text-white flex items-center gap-2">NOSOTROS</Link>
                  <Link href="/lo-nuevo" className="hover:text-white flex items-center gap-2">LO NUEVO</Link>
                  <Link href="/membresia" className="text-white hover:text-orange-400 flex items-center gap-3 ml-auto lg:ml-0">
                      <Crown size={16} className="text-orange-400" /> MEMBRESÍA SOCIOS
                  </Link>
              </nav>
              <Link href="/contenedor" className="ml-auto text-white hover:text-red-500 flex items-center gap-4 text-[11px] font-[1000] uppercase tracking-[0.15em] transition-colors group">
                  <Ship size={18} /> PROGRAMAR CONTENEDOR
              </Link>
          </div>
        </div>
      </nav>

      {/* ==================================================================================
          MÓVIL: DASHBOARD PANTALLA COMPLETA (Sin Scroll, Todo Visible)
         ================================================================================== */}
      <div className={`fixed inset-0 z-[200] lg:hidden bg-[#050505] transition-all duration-300 ${mobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        
        {/* HEADER */}
        <div className="shrink-0 px-6 py-5 flex justify-between items-center border-b border-white/10 bg-[#020202]">
             <div className="flex items-center gap-4">
                <Image src="/coyotelogo.svg" alt="Logo" width={40} height={40} className="object-contain"/>
                <div className="flex flex-col">
                    <span className="text-2xl font-[1000] text-white italic uppercase leading-none tracking-tighter">COYOTE</span>
                    <span className="text-[10px] font-bold text-[#FDCB02] uppercase tracking-[0.3em]">MENÚ</span>
                </div>
             </div>
             <button onClick={() => setMobileMenuOpen(false)} className="w-12 h-12 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-white hover:text-black transition-colors">
                <X size={24} />
             </button>
        </div>

        {/* CONTENIDO PRINCIPAL (Flex-1 para ocupar el espacio) */}
        <div className="flex-1 flex flex-col p-6 gap-4 overflow-hidden">
            
            {/* Buscador */}
            <div className="relative shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18}/>
                <input type="text" placeholder="BUSCAR TELAS..." className="w-full bg-[#111] border border-white/10 rounded-lg h-14 pl-12 pr-4 text-sm font-bold text-white uppercase focus:border-[#FDCB02] outline-none shadow-inner"/>
            </div>

            {/* Grid Principal (Bento Box Layout) */}
            <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
                
                {/* Catálogo (Botón Grande) */}
                <Link href="/catalogo" onClick={() => setMobileMenuOpen(false)} className="col-span-2 bg-[#FDCB02] rounded-lg p-5 flex items-center justify-between group relative overflow-hidden active:scale-[0.98] transition-transform">
                    <div>
                        <Package size={28} className="text-black mb-2"/>
                        <span className="text-xl font-[1000] uppercase text-black italic leading-none block">Catálogo<br/>Global</span>
                    </div>
                    <ArrowRight size={28} className="text-black opacity-60 group-hover:opacity-100 group-hover:translate-x-2 transition-all"/>
                </Link>

                {/* Lo Nuevo */}
                <Link href="/lo-nuevo" onClick={() => setMobileMenuOpen(false)} className="bg-[#111] border border-white/10 rounded-lg p-4 flex flex-col justify-center gap-2 hover:border-[#FDCB02] transition-colors group active:bg-white/5">
                    <Sparkles size={24} className="text-[#FDCB02]"/>
                    <span className="text-xs font-[900] uppercase text-white">Lo Nuevo</span>
                </Link>

                {/* Nosotros */}
                <Link href="/nosotros" onClick={() => setMobileMenuOpen(false)} className="bg-[#111] border border-white/10 rounded-lg p-4 flex flex-col justify-center gap-2 hover:border-[#FDCB02] transition-colors group active:bg-white/5">
                    <Building2 size={24} className="text-neutral-400 group-hover:text-white"/>
                    <span className="text-xs font-[900] uppercase text-white">Nosotros</span>
                </Link>
            </div>

            {/* Barra de Herramientas (Fila de Iconos) */}
            <div className="grid grid-cols-4 gap-2 shrink-0 h-20">
                <Link href="/rastreo" onClick={() => setMobileMenuOpen(false)} className="bg-[#111] rounded-lg border border-white/5 flex flex-col items-center justify-center gap-1 active:bg-white/10 active:border-[#FDCB02]">
                    <Truck size={20} className="text-[#FDCB02]"/>
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">Rastreo</span>
                </Link>
                <Link href="/contenedor" onClick={() => setMobileMenuOpen(false)} className="bg-[#111] rounded-lg border border-white/5 flex flex-col items-center justify-center gap-1 active:bg-white/10 active:border-red-500">
                    <Ship size={20} className="text-red-500"/>
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">Contenedor</span>
                </Link>
                <Link href="/facturacion" onClick={() => setMobileMenuOpen(false)} className="bg-[#111] rounded-lg border border-white/5 flex flex-col items-center justify-center gap-1 active:bg-white/10 active:border-white">
                    <FileText size={20} className="text-white"/>
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">Factura</span>
                </Link>
                <a href="https://wa.me/5215555421527" className="bg-[#111] rounded-lg border border-white/5 flex flex-col items-center justify-center gap-1 active:bg-white/10 active:border-green-500">
                    <HelpCircle size={20} className="text-green-500"/>
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">Soporte</span>
                </a>
            </div>

            {/* Membresía */}
            <Link href="/membresia" onClick={() => setMobileMenuOpen(false)} className="shrink-0 flex items-center justify-center gap-3 bg-[#FDCB02]/10 border border-[#FDCB02]/30 rounded-lg h-12 active:bg-[#FDCB02]/20">
                <Crown size={18} className="text-[#FDCB02]"/>
                <span className="text-xs font-black uppercase text-[#FDCB02] tracking-widest">Acceso Socios Coyote</span>
            </Link>

        </div>

        {/* 3. Footer (Fijo Abajo) */}
        <div className="shrink-0 p-6 bg-[#0a0a0a] border-t border-white/10 pb-8">
             {user ? (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#FDCB02] rounded-lg flex items-center justify-center text-black font-black text-lg shadow-[0_0_15px_rgba(253,203,2,0.4)]">
                            {user.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Sesión Activa</span>
                            <span className="text-base font-black text-white uppercase">{user.name.split(' ')[0]}</span>
                        </div>
                    </div>
                    <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="h-12 px-6 bg-red-500/10 text-red-500 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-red-500/20">
                        Salir
                    </button>
                </div>
             ) : (
                <Link href="/cuenta" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-3 bg-white text-black font-black uppercase text-sm h-14 rounded-lg shadow-xl active:scale-[0.98] transition-transform">
                    <User size={20}/> Iniciar Sesión / Registro
                </Link>
             )}
        </div>

      </div>
    </>
  )
}