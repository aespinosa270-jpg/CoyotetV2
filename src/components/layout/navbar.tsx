"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useCart } from "@/lib/context/cart-context" 
import { useAuth } from "@/lib/context/auth-context" 
import { products } from "@/lib/products"
import { 
  ShoppingCart, Search, User, Menu, X,
  ChevronDown, HelpCircle, FileText, Sparkles, Zap,
  Crown, Ship, LogOut, History, Settings, Building2, Package, Truck, Phone
} from "lucide-react"

export default function Navbar() {
  const { totalItems, openCart } = useCart()
  const { user, logout } = useAuth()
  
  const [searchMode, setSearchMode] = useState<'sku' | 'ia'>('sku')
  const [isDeepSearch, setIsDeepSearch] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false) // Desktop hover
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false) // Mobile drawer

  const categories = Array.from(new Set(products.map(p => p.category)));

  // Bloquear scroll cuando el menú móvil está abierto
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
        
        {/* =========================================
            1. BARRA SUPERIOR (Solo Desktop)
           ========================================= */}
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

        {/* =========================================
            2. HEADER PRINCIPAL (Desktop & Mobile)
           ========================================= */}
        <div className="max-w-[1920px] mx-auto w-full px-4 lg:px-6 py-4 lg:py-5 flex items-center justify-between gap-4 lg:gap-12 relative bg-[#050505]">
          
          {/* A. BOTÓN HAMBURGUESA (Solo Móvil) */}
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden text-white p-2 -ml-2 hover:bg-white/10 rounded-md"
          >
            <Menu size={24} />
          </button>

          {/* B. BRANDING (Logo) */}
          <Link href="/" className="shrink-0 relative z-10 group flex items-center gap-3 lg:gap-5">
              <div className="relative h-12 w-12 lg:h-20 lg:w-20 flex items-center justify-center">
                  <Image src="/coyotelogo.svg" alt="Coyote" fill className="object-contain" priority />
              </div>
              <div className="flex flex-col justify-center border-l-2 border-white/10 pl-3 lg:pl-5 py-1">
                  <h1 className="text-2xl lg:text-5xl font-[1000] text-[#FDCB02] uppercase leading-[0.8] tracking-[-0.06em] italic">
                      COYOTE
                  </h1>
                  <h2 className="text-[10px] lg:text-[14px] font-[900] text-white uppercase leading-none tracking-[0.25em] lg:tracking-[0.45em] mt-1 lg:mt-1.5 ml-0.5">
                      TEXTIL
                  </h2>
              </div>
          </Link>

          {/* C. BÚSQUEDA (Solo Desktop) */}
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

          {/* D. CARRITO Y USER (Mobile & Desktop) */}
          <div className="flex items-center gap-4 lg:gap-8 text-white ml-auto lg:ml-0">
            
            {/* User (Solo Desktop) */}
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

            {/* Carrito (Siempre Visible) */}
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

        {/* =========================================
            3. BARRA DE NAVEGACIÓN (Solo Desktop)
           ========================================= */}
        <div className="hidden lg:block border-t border-white/5 bg-[#080808] h-14 relative">
          <div className="max-w-[1920px] mx-auto w-full px-6 h-full flex items-center gap-12">
              <div className="relative h-full" onMouseEnter={() => setIsMenuOpen(true)} onMouseLeave={() => setIsMenuOpen(false)}>
                  <button className="flex items-center gap-4 h-full px-6 bg-white/5 hover:bg-[#FDCB02] hover:text-black transition-colors text-[11px] font-[1000] uppercase tracking-[0.25em] text-white border-r border-white/5">
                      <Menu size={18} strokeWidth={3}/> <span className="mt-0.5">CATÁLOGO GLOBAL</span>
                  </button>
                  {/* Dropdown Desktop */}
                  <div className={`absolute top-full left-0 w-[300px] bg-[#0a0a0a] border border-white/10 shadow-2xl transition-all duration-200 origin-top-left z-50 ${isMenuOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}`}>
                      <div className="py-2">
                          {categories.map((category) => (
                              <Link key={category} href={`/catalogo?categoria=${category}`} className="flex items-center gap-3 px-6 py-3 text-[11px] font-bold text-neutral-400 hover:text-white hover:bg-white/5 uppercase tracking-widest border-b border-white/5 last:border-0 transition-colors">
                                  <Package size={14} className="text-[#FDCB02]"/>{category}
                              </Link>
                          ))}
                      </div>
                  </div>
              </div>

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

      {/* =========================================
          4. MENÚ MÓVIL (Drawer / Overlay)
         ========================================= */}
      <div className={`fixed inset-0 z-[200] lg:hidden transition-all duration-300 ${mobileMenuOpen ? 'visible' : 'invisible delay-300'}`}>
        
        {/* Fondo oscuro (Backdrop) */}
        <div 
          className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Panel lateral */}
        <div className={`absolute top-0 left-0 bottom-0 w-[85%] max-w-sm bg-[#0a0a0a] border-r border-white/10 shadow-2xl transition-transform duration-300 flex flex-col ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          
          {/* Header del Menú */}
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
             <div className="flex flex-col justify-center border-l-2 border-[#FDCB02] pl-3">
                  <h1 className="text-2xl font-[1000] text-white uppercase leading-none italic">COYOTE</h1>
                  <h2 className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.3em]">MENÚ</h2>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-neutral-400 hover:text-white">
                <X size={24} />
              </button>
          </div>

          {/* Cuerpo del Menú (Scrollable) */}
          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
            
            {/* Buscador Móvil */}
            <div className="relative">
               <Search className="absolute left-3 top-3 text-neutral-500" size={16}/>
               <input type="text" placeholder="Buscar telas..." className="w-full bg-[#111] border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-[#FDCB02] outline-none"/>
            </div>

            {/* Enlaces Principales */}
            <div className="space-y-1">
               <Link href="/catalogo" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-sm font-black text-white uppercase bg-white/5 rounded-lg border border-white/5">
                  Catálogo Completo
               </Link>
               <Link href="/rastreo" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-neutral-300 uppercase hover:text-white">
                  <Truck size={16} className="text-[#FDCB02]"/> Rastrear Envío
               </Link>
               <Link href="/contenedor" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-neutral-300 uppercase hover:text-white">
                  <Ship size={16} className="text-red-500"/> Contenedores
               </Link>
            </div>

            <div className="border-t border-white/10 my-4"/>

            {/* Categorías */}
            <div>
              <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-3 px-4">Categorías</p>
              {categories.map(cat => (
                <Link key={cat} href={`/catalogo?categoria=${cat}`} onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-sm text-neutral-400 hover:text-[#FDCB02] uppercase font-medium">
                  {cat}
                </Link>
              ))}
            </div>
          </div>

          {/* Footer del Menú */}
          <div className="p-6 border-t border-white/10 bg-[#050505]">
             {user ? (
               <button onClick={logout} className="flex items-center gap-3 text-red-500 font-bold text-sm uppercase">
                 <LogOut size={16}/> Cerrar Sesión
               </button>
             ) : (
               <Link href="/cuenta" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 text-white font-bold text-sm uppercase">
                 <User size={16} className="text-[#FDCB02]"/> Iniciar Sesión
               </Link>
             )}
             <div className="mt-6 flex items-center gap-2 text-xs text-neutral-500">
                <Phone size={12}/> 55 5542 1527
             </div>
          </div>
        </div>
      </div>
    </>
  )
}