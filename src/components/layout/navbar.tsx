"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useCart } from "@/lib/context/cart-context" 
import { useSession, signOut } from "next-auth/react"
import { usePathname } from "next/navigation" 
import { 
  ShoppingCart, Search, User, Menu, X,
  HelpCircle, FileText, Sparkles,
  Crown, Ship, Package, Truck, 
  ArrowRight, LogOut, Loader2, Link as LinkIcon,
  ChevronRight, MessageCircle
} from "lucide-react"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

export default function Navbar() {
  const pathname = usePathname() 

  const { totalItems, openCart } = useCart()
  const { data: session } = useSession()
  const user = session?.user
  
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAIResultsOpen, setIsAIResultsOpen] = useState(false)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const [input, setInput] = useState("")

  const categories = [
    { name: "Telas Deportivas", id: "telas-deportivas" },
    { name: "Telas para Sublimar", id: "telas-para-sublimar" },
    { name: "Telas Escolares", id: "telas-escolares" },
    { name: "Licras", id: "licras" },
    { name: "Telas Nacionales", id: "telas-nacionales" },
    { name: "Telas para Decoración", id: "telas-para-decoracion" },
    { name: "Telas Invierno", id: "telas-invierno" },
    { name: "Telas de Temporada", id: "telas-de-temporada" },
    { name: "Forros", id: "forros" },
    { name: "Gabardinas", id: "gabardinas" },
    { name: "Mezclilla", id: "mezclilla" },
    { name: "Telas para Campaña", id: "telas-para-campana" },
    { name: "Telas para Maratones", id: "telas-para-maratones" },
    { name: "Repelentes", id: "repelentes" },
  ]

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  const handleLogout = async () => {
    setMobileMenuOpen(false)
    await signOut({ callbackUrl: '/cuenta' })
  }

  const sendAIMessage = async (text: string) => {
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: text }
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setIsLoading(true)
    setIsAIResultsOpen(true)

    const assistantId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }])

    try {
      abortRef.current = new AbortController()
      const res = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHistory.map(m => ({ role: m.role, content: m.content })),
        }),
        signal: abortRef.current.signal,
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split("\n").filter(Boolean)
        for (const line of lines) {
          if (line.startsWith("0:")) {
            try {
              const chunk = JSON.parse(line.slice(2))
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
              )
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: "Error al conectar. Intenta de nuevo." }
              : m
          )
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendAIMessage(input)
    setInput("")
  }

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    if (pathname === '/') {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            const headerOffset = 150; 
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
  
            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        }
        setIsMenuOpen(false);
        setMobileMenuOpen(false);
    }
  };

  if (pathname?.startsWith("/flotilla")) return null;

  return (
    <>
      <nav className="sticky top-0 z-[100] w-full flex flex-col bg-[#050505] border-b border-white/10 font-sans selection:bg-[#FDCB02] selection:text-black transition-all">
        
        {/* BANNER SUPERIOR */}
        <div className="bg-[#FDCB02] text-black h-10 flex items-center justify-center text-[10px] font-[1000] uppercase tracking-widest">
            <Sparkles size={14} className="mr-2" />
            IA a tu lado: compra 24/7/365, siempre disponibles.
            <Sparkles size={14} className="ml-2" />
        </div>

        {/* 1. BARRA SECUNDARIA */}
        <div className="bg-[#020202] h-10 hidden lg:flex items-center border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
          <div className="max-w-[1920px] mx-auto w-full px-6 flex justify-between items-center">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2 text-[#FDCB02]">
                 <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
                 Sistema: En Línea
              </span>
              <span className="w-px h-4 bg-white/10"/>
              <Link href="/rastreo" className="hover:text-white transition-colors flex items-center gap-2">
                <Truck size={14} /> Rastrear Envío
              </Link>
            </div>
            <div className="flex items-center gap-6">
              <a href="https://wa.me/5215555421527" target="_blank" className="hover:text-white transition-colors flex items-center gap-2">
                <HelpCircle size={14} /> Soporte Técnico
              </a>
              <Link href="/facturacion" className="hover:text-white transition-colors flex items-center gap-2 text-white">
                <FileText size={14} /> Facturación 4.0
              </Link>
            </div>
          </div>
        </div>

        {/* 2. HEADER PRINCIPAL */}
        <div className="max-w-[1920px] mx-auto w-full px-4 lg:px-6 py-4 lg:py-5 flex items-center justify-between gap-4 lg:gap-12 relative bg-[#050505]">
          
          <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-white p-2 -ml-2 hover:bg-white/10 rounded-md active:scale-95 transition-transform">
            <Menu size={24} />
          </button>

          <Link href="/" className="shrink-0 relative z-10 group flex items-center gap-4 lg:gap-6">
              <div className="relative h-12 w-12 lg:h-[110px] lg:w-[110px] flex items-center justify-center">
                  <Image src="/coyotelogo.svg" alt="Coyote" fill className="object-contain" priority />
              </div>
              <div className="w-[3px] lg:w-[4px] h-[50px] lg:h-[105px] bg-[#666666] rounded-sm"></div>
              <div className="flex items-center gap-4">
                  <div className="flex flex-col justify-center">
                      <h1 className="text-[34px] lg:text-[68px] text-[#FDCB02] uppercase leading-[0.75]" style={{ fontFamily: '"Impact", "Arial Black", sans-serif', transform: 'scaleY(0.95)' }}>COYOTE</h1>
                      <h2 className="text-[24px] lg:text-[48px] text-white uppercase leading-[0.8] mt-1 lg:mt-2" style={{ fontFamily: '"Impact", "Arial Black", sans-serif', transform: 'scaleY(0.95)' }}>TEXTIL</h2>
                  </div>
              </div>
          </Link>

{/* 🔥 BADGE PODEROSO DE ENVÍOS (ENTRE LOGO Y BUSCADOR) 🔥 */}
<div className="hidden 2xl:flex flex-col justify-center ml-8 pl-8 border-l-[8px] border-[#222222]">
              {/* Semáforo MX Parpadeante en secuencia (Masivo) */}
              <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.8)]"></div>
                  <div className="w-8 h-8 rounded-full bg-white animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.8)]" style={{ animationDelay: '200ms' }}></div>
                  <div className="w-8 h-8 rounded-full bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)]" style={{ animationDelay: '400ms' }}></div>
              </div>
              
              <span className="text-xs font-black text-[#FDCB02] uppercase tracking-[0.4em] mb-1 leading-none">
                  Infraestructura Nacional
              </span>
              <span 
                className="text-[32px] font-black text-white uppercase tracking-wider leading-[0.85]" 
                style={{ fontFamily: '"Impact", "Arial Black", sans-serif', transform: 'scaleY(0.95)' }}
              >
                  ENVÍOS A TODA LA REPÚBLICA
              </span>
          </div>
          {/* BUSCADOR IA */}
          <div className="flex-1 hidden lg:flex max-w-2xl relative z-20 ml-auto justify-end">
              <form onSubmit={onSearchSubmit} className="w-full flex h-[52px] bg-[#111] border rounded-sm transition-all overflow-hidden border-[#FDCB02] ring-1 ring-[#FDCB02]">
                  <div className="flex items-center px-5 bg-[#1a1a1a] border-r border-white/10 cursor-default">
                      <div className="flex flex-col items-center justify-center w-16">
                        <Sparkles size={14} className="text-[#FDCB02] mb-0.5 animate-pulse" />
                        <span className="text-[9px] font-[1000] uppercase tracking-tighter text-[#FDCB02]">COYOTE IA</span>
                      </div>
                  </div>
                  <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pregunta sobre rendimientos, precios o stock..." className="flex-1 bg-transparent px-6 text-[13px] font-bold text-white placeholder:text-neutral-700 focus:outline-none uppercase tracking-wider"/>
                  <button type="submit" className="bg-[#FDCB02] hover:bg-[#ffe159] text-black px-7 flex items-center justify-center transition-colors">
                    {isLoading ? <Loader2 size={22} className="animate-spin" /> : <Search size={22} strokeWidth={3}/>}
                  </button>
              </form>

              {/* PANEL DE RESULTADOS IA */}
              {isAIResultsOpen && messages.length > 0 && (
                <div className="absolute top-full left-0 mt-3 w-full bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-4 border-b border-white/5 bg-black/40 flex justify-between items-center">
                    <span className="text-[10px] font-black text-[#FDCB02] uppercase tracking-[0.2em] flex items-center gap-2"><Sparkles size={12} /> Coyote Intelligence</span>
                    <button onClick={() => setIsAIResultsOpen(false)} className="text-neutral-500 hover:text-white"><X size={14}/></button>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto p-6 space-y-6">
                    {messages.map((m) => (
                      <div key={m.id} className={`flex gap-4 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed ${m.role === "user" ? "bg-white/5 text-neutral-400 italic rounded-tr-none" : "bg-[#111] text-white border border-white/5 rounded-tl-none font-medium"}`}>
                          {m.content}
                          {m.role === "assistant" && isLoading && m.content === "" && <span className="inline-block w-2 h-3 bg-[#FDCB02] animate-pulse ml-1 rounded-sm"/>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-black/40 border-t border-white/5 flex justify-center">
                    <button onClick={() => { setMessages([]); setInput(''); setIsAIResultsOpen(false) }} className="text-[9px] font-black text-neutral-600 uppercase hover:text-white transition-colors">Limpiar Consulta</button>
                  </div>
                </div>
              )}
          </div>

          <div className="flex items-center gap-4 lg:gap-8 text-white ml-auto lg:ml-8">
            <div className="hidden lg:flex items-center gap-4">
              {user ? (
                 <div className="relative group py-2">
                    <Link href="/perfil" className="flex items-center gap-4 cursor-pointer">
                        <div className="text-right">
                            <span className="text-[9px] text-[#FDCB02] font-black block tracking-widest">HOLA, SOCIO</span>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-white group-hover:text-[#FDCB02] transition-colors">{user.name?.split(' ')[0] || "USUARIO"}</span>
                        </div>
                        <div className="w-10 h-10 bg-white/5 border border-white/10 text-neutral-400 font-black flex items-center justify-center rounded-lg group-hover:bg-[#FDCB02] group-hover:text-black group-hover:border-[#FDCB02] transition-all shadow-lg">
                            {user.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                    </Link>
                    <div className="absolute top-full right-0 mt-2 w-64 opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-300 z-50">
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl">
                            <div className="p-4 border-b border-white/5 bg-gradient-to-br from-[#111] to-black">
                                <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Estado de Cuenta</p>
                                <p className="text-xs font-black text-white truncate">{user.email}</p>
                            </div>
                            <div className="py-2">
                                <Link href="/perfil" className="flex items-center gap-3 px-5 py-3 text-[11px] font-bold text-neutral-400 hover:text-white hover:bg-white/5 uppercase tracking-widest transition-colors"><User size={14} className="text-[#FDCB02]"/> Mi Tablero / Perfil</Link>
                                <Link href="/perfil" className="flex items-center gap-3 px-5 py-3 text-[11px] font-bold text-neutral-400 hover:text-white hover:bg-white/5 uppercase tracking-widest transition-colors"><Package size={14} className="text-[#FDCB02]"/> Mis Pedidos</Link>
                                <Link href="/facturacion" className="flex items-center gap-3 px-5 py-3 text-[11px] font-bold text-neutral-400 hover:text-white hover:bg-white/5 uppercase tracking-widest transition-colors"><FileText size={14} className="text-[#FDCB02]"/> Datos Fiscales</Link>
                            </div>
                            <button onClick={handleLogout} className="flex items-center gap-3 px-5 py-4 text-[11px] font-bold text-red-500 hover:text-red-400 hover:bg-red-500/10 uppercase tracking-widest transition-colors border-t border-white/5 text-left w-full"><LogOut size={14} /> Cerrar Sesión</button>
                        </div>
                    </div>
                 </div>
              ) : (
                <Link href="/cuenta" className="flex flex-col text-right group py-2">
                    <span className="text-[9px] text-neutral-500 font-black uppercase mb-1 group-hover:text-white">Acceso</span>
                    <span className="text-[11px] font-[1000] text-white uppercase flex items-center gap-2 group-hover:text-[#FDCB02]">INGRESAR <User size={15} strokeWidth={3}/></span>
                </Link>
              )}
            </div>

            <button onClick={openCart} className="flex items-center gap-3 lg:gap-5 bg-white text-black pl-4 lg:pl-6 pr-4 lg:pr-8 py-2 lg:py-3.5 hover:bg-[#FDCB02] transition-all relative group rounded-sm shadow-xl">
              <div className="relative">
                <ShoppingCart size={20} strokeWidth={3} className="lg:w-[22px] lg:h-[22px]"/>
                {totalItems > 0 && <span className="absolute -top-2 -right-2 lg:-top-3 lg:-right-3 bg-red-600 text-white text-[9px] lg:text-[10px] font-black h-4 w-4 lg:h-5 lg:w-5 flex items-center justify-center rounded-full border-2 border-white">{totalItems}</span>}
              </div>
              <div className="hidden lg:flex flex-col text-left leading-none border-l border-black/15 pl-5 ml-1">
                  <span className="font-[1000] text-[12px] uppercase tracking-widest">PEDIDO</span>
                  <span className="text-[10px] font-mono text-neutral-500 font-bold mt-1 uppercase">Activo</span>
              </div>
            </button>
          </div>
        </div>

        {/* 3. NAVEGACIÓN INFERIOR (CON NUEVAS SECCIONES Y ORDEN SOLICITADO) */}
        <div className="hidden lg:block border-t border-white/5 bg-[#080808] h-14 relative">
          <div className="max-w-[1920px] mx-auto w-full px-6 h-full flex items-center gap-12">
              
              {/* MENÚ DESPLEGABLE RE-DISEÑADO (BLOQUE AMARILLO) */}
              <div className="relative h-full flex items-center" onMouseEnter={() => setIsMenuOpen(true)} onMouseLeave={() => setIsMenuOpen(false)}>
                  <button className="flex items-center gap-3 h-full px-8 bg-[#FDCB02] hover:bg-[#ffe159] transition-colors text-xs font-[1000] uppercase tracking-widest text-black cursor-pointer shadow-[0_0_20px_rgba(253,203,2,0.2)]">
                      <Menu size={18} strokeWidth={3}/> <span className="mt-0.5">Categorías</span>
                  </button>
                  <div className={`absolute top-full left-0 w-[320px] bg-[#0A0A0A] border border-white/10 shadow-2xl transition-all duration-200 origin-top-left z-50 ${isMenuOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}`}>
                      <div className="py-2 max-h-[60vh] overflow-y-auto custom-scrollbar-dark">
                          {categories.map((category) => (
                              <Link 
                                key={category.id} 
                                href={`/#${category.id}`} 
                                onClick={(e) => scrollToSection(e, category.id)}
                                className="flex items-center gap-4 px-6 py-4 text-[10px] font-bold text-neutral-400 hover:text-white hover:bg-white/5 uppercase tracking-widest border-b border-white/5 last:border-0 transition-colors group"
                              >
                                  <Package size={14} className="text-neutral-600 group-hover:text-[#FDCB02] transition-colors"/>
                                  {category.name}
                              </Link>
                          ))}
                          <Link href="/catalogo" className="flex items-center gap-3 px-6 py-5 text-[11px] font-[1000] text-[#FDCB02] hover:bg-white/5 uppercase tracking-widest transition-colors bg-[#111] mt-2">
                              VER TODO EL INVENTARIO <ArrowRight size={14} />
                          </Link>
                      </div>
                  </div>
              </div>
              
              {/* ENLACES DIRECTOS ACTUALIZADOS */}
              <nav className="flex gap-8 xl:gap-12 text-[11px] font-[1000] uppercase tracking-[0.2em] text-neutral-500 h-full items-center flex-1">
                  
                  <Link href="/hilos" className="hover:text-white flex items-center gap-2 transition-colors">
                    HILOS
                  </Link>
                  <Link href="/elasticos" className="hover:text-white flex items-center gap-2 transition-colors">
                    ELÁSTICOS
                  </Link>
                  <Link href="/nosotros" className="hover:text-white flex items-center gap-2 transition-colors">
                    NOSOTROS
                  </Link>
                  <Link href="/atencion" className="hover:text-white transition-colors">
                          ATENCIÓN 24/7
                      </Link>
                  
                  
                  {/* ESPACIADOR FLEXIBLE */}
                  <div className="flex-1"></div>

                  {/* BLOQUE DERECHO: MEMBRESÍA + CONTENEDOR + ATENCIÓN */}
                  <div className="flex items-center gap-8">
                    {/* 1. NØR */}
                    <Link href="https://nor.com.mx" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#FDCB02] text-[11px] font-black uppercase tracking-[0.3em] transition-colors">
                        NØR
                    </Link>

                    {/* 2. Membresía */}
                    <Link href="/membresia" className="text-white hover:text-orange-400 flex items-center gap-2 text-[11px] font-[1000] uppercase tracking-[0.15em] transition-colors">
                        <Crown size={15} className="text-orange-400" /> MEMBRESÍA SOCIOS
                    </Link>
                    
                    {/* 3. Programar Contenedor */}
                    <Link href="/contenedor" className="text-white hover:text-[#FDCB02] flex items-center gap-3 text-[11px] font-[1000] uppercase tracking-[0.15em] transition-colors group border border-white/10 hover:border-[#FDCB02] px-6 py-2.5 rounded-full">
                        <Ship size={16} /> PROGRAMAR CONTENEDOR
                    </Link>
                  </div>
              </nav>

          </div>
        </div>

      </nav>

      {/* MÓVIL */}
      <div className={`fixed inset-0 z-[200] lg:hidden bg-[#050505] transition-all duration-300 ${mobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        <div className="shrink-0 px-6 py-5 flex justify-between items-center border-b border-white/10 bg-[#020202]">
             
             {/* 🔥 LOGO MÓVIL CALCADO IDENTICO CON AJUSTES 🔥 */}
             <div className="flex items-center gap-4">
                <Image src="/coyotelogo.svg" alt="Logo" width={60} height={60} className="object-contain"/>
                
                <div className="w-[3px] h-[60px] bg-[#666666] rounded-sm"></div>
                
                <div className="flex items-center gap-2">
                    <div className="flex flex-col justify-center">
                        <span 
                          className="text-[34px] text-[#FDCB02] uppercase leading-[0.75]" 
                          style={{ fontFamily: '"Impact", "Arial Black", sans-serif', transform: 'scaleY(0.95)' }}
                        >
                          COYOTE
                        </span>
                        <span 
                          className="text-[24px] text-white uppercase leading-[0.8] mt-1" 
                          style={{ fontFamily: '"Impact", "Arial Black", sans-serif', transform: 'scaleY(0.95)' }}
                        >
                          TEXTIL
                        </span>
                    </div>
                </div>
             </div>

             <button onClick={() => setMobileMenuOpen(false)} className="w-12 h-12 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-white hover:text-black transition-colors">
                <X size={24} />
             </button>
        </div>
        <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto">
            <form onSubmit={onSearchSubmit} className="relative shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FDCB02]" size={18}/>
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  type="text" 
                  placeholder="COYOTE IA: PREGUNTA ALGO..." 
                  className="w-full bg-[#111] border border-[#FDCB02] rounded-lg h-14 pl-12 pr-4 text-sm font-bold text-white uppercase focus:border-white outline-none shadow-inner"
                />
            </form>
            
             {/* PANEL DE RESULTADOS IA MÓVIL */}
              {isAIResultsOpen && messages.length > 0 && (
                <div className="mt-2 w-full bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 shrink-0">
                  <div className="p-4 border-b border-white/5 bg-black/40 flex justify-between items-center">
                    <span className="text-[10px] font-black text-[#FDCB02] uppercase tracking-[0.2em] flex items-center gap-2">
                      <Sparkles size={12} /> Coyote Intelligence
                    </span>
                    <button onClick={() => setIsAIResultsOpen(false)} className="text-neutral-500 hover:text-white"><X size={14}/></button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-4 space-y-4">
                    {messages.map((m) => (
                      <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[90%] p-3 rounded-2xl text-xs leading-relaxed ${
                          m.role === "user" 
                          ? "bg-white/5 text-neutral-400 italic rounded-tr-none" 
                          : "bg-[#111] text-white border border-white/5 rounded-tl-none font-medium"
                        }`}>
                          {m.content}
                          {m.role === "assistant" && isLoading && m.content === "" && (
                            <span className="inline-block w-2 h-3 bg-[#FDCB02] animate-pulse ml-1 rounded-sm"/>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-black/40 border-t border-white/5 flex justify-center">
                    <button 
                      onClick={() => { setMessages([]); setInput(''); setIsAIResultsOpen(false) }} 
                      className="text-[9px] font-black text-neutral-600 uppercase hover:text-white transition-colors"
                    >
                      Limpiar Consulta
                    </button>
                  </div>
                </div>
              )}
            
            {/* ENLACES MÓVILES NUEVOS */}
            <div className="flex flex-col gap-2 mt-2">
                <Link href="/hilos" onClick={() => setMobileMenuOpen(false)} className="bg-[#111] border border-white/5 p-4 rounded-lg flex items-center justify-between text-white font-bold text-xs uppercase tracking-wider">
                    Hilos <ChevronRight size={16} className="text-neutral-500"/>
                </Link>
                <Link href="/elasticos" onClick={() => setMobileMenuOpen(false)} className="bg-[#111] border border-white/5 p-4 rounded-lg flex items-center justify-between text-white font-bold text-xs uppercase tracking-wider">
                    Elásticos <ChevronRight size={16} className="text-neutral-500"/>
                </Link>
                <Link href="/nosotros" onClick={() => setMobileMenuOpen(false)} className="bg-[#111] border border-white/5 p-4 rounded-lg flex items-center justify-between text-white font-bold text-xs uppercase tracking-wider">
                    Nosotros <ChevronRight size={16} className="text-neutral-500"/>
                </Link>
                <Link href="/membresia" onClick={() => setMobileMenuOpen(false)} className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-lg flex items-center justify-between text-orange-400 font-bold text-xs uppercase tracking-wider">
                    <span className="flex items-center gap-2"><Crown size={16} /> Membresía Socios</span>
                    <ChevronRight size={16} className="text-orange-400/50"/>
                </Link>
                <a href="https://wa.me/5215555421527" target="_blank" rel="noopener noreferrer" className="bg-green-500 text-black p-4 rounded-lg flex items-center justify-between font-black text-xs uppercase tracking-wider mt-2 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                    <span className="flex items-center gap-2"><MessageCircle size={16} /> ATENCIÓN 24/7</span>
                    <ArrowRight size={16} className="text-black/50"/>
                </a>
            </div>

            <div className="grid grid-cols-2 gap-3 shrink-0 mt-4">
                <Link href="/catalogo" onClick={() => setMobileMenuOpen(false)} className="col-span-2 bg-[#FDCB02] rounded-lg p-5 flex items-center justify-between group relative overflow-hidden active:scale-[0.98] transition-transform">
                    <div>
                        <Package size={28} className="text-black mb-2"/>
                        <span className="text-xl font-[1000] uppercase text-black italic leading-none block">Catálogo<br/>Global</span>
                    </div>
                    <ArrowRight size={28} className="text-black opacity-60 group-hover:opacity-100 group-hover:translate-x-2 transition-all"/>
                </Link>
            </div>
        </div>
      </div>
    </>
  )
}