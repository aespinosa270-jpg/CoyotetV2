"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useCart } from "@/lib/context/cart-context" 
import { useAuth } from "@/lib/context/auth-context" 
import { products } from "@/lib/products"
import { 
  ShoppingCart, Search, User, Menu, 
  ChevronDown, HelpCircle, FileText, Sparkles, Zap,
  Crown, Ship, LogOut, History, Settings, Building2, Package, Truck
} from "lucide-react"

export default function Navbar() {
  const { totalItems, openCart } = useCart()
  const { user, logout } = useAuth()
  
  const [searchMode, setSearchMode] = useState<'sku' | 'ia'>('sku')
  const [isDeepSearch, setIsDeepSearch] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const categories = Array.from(new Set(products.map(p => p.category)));

  return (
    <nav className="sticky top-0 z-[100] w-full flex flex-col bg-[#050505] border-b border-white/10 font-sans selection:bg-[#FDCB02] selection:text-black">
      
      {/* 1. BARRA SUPERIOR: UTILIDADES */}
      <div className="bg-[#020202] h-9 hidden lg:flex items-center border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
        <div className="max-w-[1920px] mx-auto w-full px-6 flex justify-between items-center">
          
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 text-[#FDCB02]">
               <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"/>
               Sistema: En Línea
            </span>
            <span className="w-px h-3 bg-white/10"/>
            
            {/* 👇 CAMBIO AQUI: Rastrear Envío (Skydropx) */}
            <Link href="/rastreo" className="hover:text-white transition-colors flex items-center gap-2">
              <Truck size={11} /> Rastrear Envío
            </Link>
          </div>

          <div className="flex items-center gap-6">
            <a 
              href="https://wa.me/5215555421527?text=Hola%20Coyote%20Textil,%20necesito%20soporte%20t%C3%A9cnico."
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
            >
              <HelpCircle size={11} /> Soporte Técnico
            </a>

            <Link href="/facturacion" className="hover:text-white transition-colors flex items-center gap-2 text-white">
              <FileText size={11} /> Facturación 4.0
            </Link>
          </div>

        </div>
      </div>

      {/* 2. HEADER PRINCIPAL */}
      <div className="max-w-[1920px] mx-auto w-full px-6 py-5 flex items-center gap-8 lg:gap-12 relative bg-[#050505]">
        
        {/* BRANDING */}
        <Link href="/" className="shrink-0 relative z-10 group flex items-center gap-5">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-white blur-[80px] rounded-full opacity-5 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none" />
            
            <div className="relative h-20 w-20 flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                <Image 
                  src="/coyotelogo.svg" 
                  alt="Coyote Industrial" 
                  fill
                  className="object-contain relative z-10" 
                  priority 
                />
            </div>

            <div className="flex flex-col justify-center border-l-2 border-white/10 pl-5 py-1">
                <h1 className="text-5xl font-[1000] text-[#FDCB02] uppercase leading-[0.8] tracking-[-0.06em] italic">
                    COYOTE
                </h1>
                <h2 className="text-[14px] font-[900] text-white uppercase leading-none tracking-[0.45em] mt-1.5 ml-1">
                    TEXTIL
                </h2>
            </div>
        </Link>

        {/* BÚSQUEDA */}
        <div className="flex-1 hidden lg:flex max-w-2xl relative z-20">
            <form className="w-full flex h-[52px] bg-[#111] border border-white/10 rounded-sm focus-within:border-[#FDCB02] focus-within:ring-1 focus-within:ring-[#FDCB02] transition-all overflow-hidden">
                <div 
                    className="flex items-center px-5 bg-[#1a1a1a] border-r border-white/10 cursor-pointer hover:bg-[#222] group" 
                    onClick={() => setSearchMode(searchMode === 'sku' ? 'ia' : 'sku')}
                >
                    <span className="text-[10px] font-[1000] uppercase text-neutral-400 w-16 text-center group-hover:text-white transition-colors">
                        {searchMode === 'sku' ? 'SKU' : 'IA'}
                    </span>
                    <ChevronDown size={12} className="text-neutral-600 ml-1"/>
                </div>

                <input 
                    type="text" 
                    placeholder={searchMode === 'ia' ? "Describe tu necesidad técnica..." : "BUSCAR REFERENCIA, FIBRA O GRAMAJE..."}
                    className="flex-1 bg-transparent px-6 text-[13px] font-bold text-white placeholder:text-neutral-700 focus:outline-none uppercase tracking-wider"
                />

                <div 
                    onClick={() => setIsDeepSearch(!isDeepSearch)}
                    className={`flex items-center gap-3 px-5 border-l border-white/10 cursor-pointer hover:bg-white/5 select-none transition-colors ${isDeepSearch ? 'bg-[#FDCB02]/5' : ''}`}
                >
                    <Zap size={16} className={isDeepSearch ? "text-[#FDCB02] fill-[#FDCB02]" : "text-neutral-700"} />
                    <span className={`text-[9px] font-[1000] uppercase hidden xl:block ${isDeepSearch ? 'text-[#FDCB02]' : 'text-neutral-600'}`}>Pro</span>
                </div>

                <button className="bg-[#FDCB02] hover:bg-[#ffe159] text-black px-7 flex items-center justify-center transition-colors">
                    <Search size={22} strokeWidth={3}/>
                </button>
            </form>
        </div>

        {/* ACCIONES DE USUARIO */}
        <div className="flex items-center gap-8 text-white ml-auto">
          {user ? (
            <div className="hidden lg:flex items-center gap-4 group relative cursor-pointer py-2">
                <div className="flex flex-col text-right leading-tight">
                    <span className="text-[9px] text-neutral-500 font-black uppercase mb-0.5 tracking-tighter">OPERADOR:</span>
                    <span className="text-[11px] font-[1000] uppercase text-white flex items-center justify-end gap-1.5 tracking-tight">
                        {user.name.split(' ')[0]} <ChevronDown size={10} className="text-[#FDCB02]"/>
                    </span>
                </div>
                <div className="w-11 h-11 rounded-sm bg-[#FDCB02] text-black font-[1000] border border-white/10 flex items-center justify-center text-sm shadow-[0_0_15px_rgba(253,203,2,0.2)]">
                    {user.name.charAt(0)}
                </div>
                {/* Dropdown Dashboard */}
                <div className="absolute top-full right-0 pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 w-64 z-50">
                    <div className="bg-[#0a0a0a] border border-white/15 shadow-2xl rounded-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-5 border-b border-white/10 bg-[#111]">
                            <p className="text-[9px] text-neutral-600 uppercase font-[1000] tracking-[0.2em] mb-1.5">Identificación</p>
                            <p className="text-[11px] text-white font-mono truncate">{user.email}</p>
                        </div>
                        <Link href="/pedidos" className="px-6 py-4 hover:bg-white/5 flex items-center gap-4 text-[11px] font-[1000] uppercase text-neutral-300 hover:text-white transition-colors border-b border-white/5 tracking-widest">
                            <History size={16} className="text-[#FDCB02]"/> Mis Pedidos
                        </Link>
                        <Link href="/facturas" className="px-6 py-4 hover:bg-white/5 flex items-center gap-4 text-[11px] font-[1000] uppercase text-neutral-300 hover:text-white transition-colors border-b border-white/5 tracking-widest">
                            <FileText size={16} className="text-[#FDCB02]"/> Facturación
                        </Link>
                         <Link href="/configuracion" className="px-6 py-4 hover:bg-white/5 flex items-center gap-4 text-[11px] font-[1000] uppercase text-neutral-300 hover:text-white transition-colors border-b border-white/5 tracking-widest">
                            <Settings size={16} className="text-[#FDCB02]"/> Ajustes de Perfil
                        </Link>
                        <button onClick={logout} className="px-6 py-5 hover:bg-red-900/20 text-red-500 flex items-center gap-4 text-[11px] font-[1000] uppercase transition-colors tracking-widest">
                            <LogOut size={16}/> Cerrar Sesión
                        </button>
                    </div>
                </div>
            </div>
          ) : (
            <Link href="/cuenta" className="hidden lg:flex flex-col text-right group">
                <span className="text-[9px] text-neutral-500 font-black uppercase mb-1 tracking-tighter group-hover:text-white">Acceso Partner</span>
                <span className="text-[11px] font-[1000] text-white uppercase flex items-center gap-2 group-hover:text-[#FDCB02] transition-colors tracking-widest">
                    INGRESAR <User size={15} strokeWidth={3}/>
                </span>
            </Link>
          )}

          <button onClick={openCart} className="flex items-center gap-5 bg-white text-black pl-6 pr-8 py-3.5 hover:bg-[#FDCB02] transition-all relative group rounded-sm shadow-xl">
            <div className="relative">
              <ShoppingCart size={22} strokeWidth={3}/>
              {totalItems > 0 && (
                <span className="absolute -top-3 -right-3 bg-red-600 text-white text-[10px] font-black h-5 w-5 flex items-center justify-center rounded-full border-2 border-white">
                  {totalItems}
                </span>
              )}
            </div>
            <div className="flex flex-col text-left leading-none border-l border-black/15 pl-5 ml-1">
                <span className="font-[1000] text-[12px] uppercase tracking-widest">PEDIDO</span>
                <span className="text-[10px] font-mono text-neutral-500 group-hover:text-black font-bold mt-1 uppercase">Activo</span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. NAVEGACIÓN TÉCNICA */}
      <div className="border-t border-white/5 bg-[#080808] h-14 relative">
        <div className="max-w-[1920px] mx-auto w-full px-6 h-full flex items-center gap-12">
            <div className="relative h-full" onMouseEnter={() => setIsMenuOpen(true)} onMouseLeave={() => setIsMenuOpen(false)}>
                <button className="flex items-center gap-4 h-full px-6 bg-white/5 hover:bg-[#FDCB02] hover:text-black transition-colors text-[11px] font-[1000] uppercase tracking-[0.25em] text-white border-r border-white/5">
                    <Menu size={18} strokeWidth={3}/> 
                    <span className="mt-0.5">CATÁLOGO GLOBAL</span>
                </button>
                <div className={`absolute top-full left-0 w-[300px] bg-[#0a0a0a] border border-white/10 shadow-2xl transition-all duration-200 origin-top-left z-50 ${isMenuOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}`}>
                    <div className="py-2">
                        {categories.map((category) => (
                            <Link key={category} href={`/catalogo?categoria=${category}`} className="flex items-center gap-3 px-6 py-3 text-[11px] font-bold text-neutral-400 hover:text-white hover:bg-white/5 uppercase tracking-widest border-b border-white/5 last:border-0 transition-colors">
                                <Package size={14} className="text-[#FDCB02]"/>{category}
                            </Link>
                        ))}
                        <Link href="/catalogo" className="flex items-center gap-3 px-6 py-4 text-[11px] font-[1000] text-[#FDCB02] hover:bg-[#FDCB02] hover:text-black uppercase tracking-widest transition-colors mt-1">
                            Ver Todo el Inventario &rarr;
                        </Link>
                    </div>
                </div>
            </div>

            <nav className="flex gap-12 text-[11px] font-[1000] uppercase tracking-[0.2em] text-neutral-500 h-full items-center">
                <Link href="/nosotros" className="hover:text-white flex items-center gap-2 group transition-all">
                    <Building2 size={16} className="text-[#FDCB02] group-hover:text-white transition-colors"/> NOSOTROS
                </Link>
                <Link href="/lo-nuevo" className="hover:text-white flex items-center gap-2 group transition-all">
                    <Sparkles size={14} className="text-[#FDCB02] group-hover:scale-125 transition-transform"/> LO NUEVO
                </Link>
                <Link href="/membresia" className="text-white hover:text-orange-400 flex items-center gap-3 transition-all ml-auto lg:ml-0">
                    <Crown size={16} className="text-orange-400" /> MEMBRESÍA SOCIOS
                </Link>
            </nav>

            <Link href="/contenedor" className="ml-auto text-white hover:text-red-500 flex items-center gap-4 text-[11px] font-[1000] uppercase tracking-[0.15em] transition-colors group">
                <div className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 relative shadow-[0_0_10px_#ef4444]"></span>
                </div>
                <Ship size={18} /> PROGRAMAR CONTENEDOR
            </Link>
        </div>
      </div>
    </nav>
  )
}