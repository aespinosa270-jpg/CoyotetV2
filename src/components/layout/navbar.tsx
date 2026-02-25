"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useCart } from "@/lib/context/cart-context" 
import { useSession, signOut } from "next-auth/react"
import { usePathname } from "next/navigation" // 🔥 1. IMPORTAMOS EL DETECTOR DE RUTAS
import { 
  ShoppingCart, Search, User, Menu, X,
  ChevronDown, HelpCircle, FileText, Sparkles,
  Crown, Ship, Building2, Package, Truck, 
  ArrowRight, LogOut, ChevronRight, Loader2
} from "lucide-react"

// ─── Tipo simple para mensajes ───────────────────────────────────────────────
interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

export default function Navbar() {
  const pathname = usePathname() // 🔥 2. LEEMOS LA RUTA ACTUAL

  const { totalItems, openCart } = useCart()
  const { data: session } = useSession()
  const user = session?.user
  
  const [searchMode, setSearchMode] = useState<'sku' | 'ia'>('sku')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAIResultsOpen, setIsAIResultsOpen] = useState(false)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const [input, setInput] = useState("")

  const categories = [
    "Telas Deportivas",
    "Telas para Sublimar",
    "Telas Escolares",
    "Telas Nacionales"
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
    if (searchMode === "ia") {
      if (!input.trim() || isLoading) return
      sendAIMessage(input)
      setInput("")
    } else {
      window.location.href = `/catalogo?q=${encodeURIComponent(input)}`
    }
  }

  // 🔥 3. EL CADENERO: SI ES LA APP DE CHOFERES, ESCONDEMOS EL NAVBAR COMPLETO
  if (pathname?.startsWith("/flotilla")) return null;

  return (
    <>
      <nav className="sticky top-0 z-[100] w-full flex flex-col bg-[#050505] border-b border-white/10 font-sans selection:bg-[#FDCB02] selection:text-black transition-all">
        
        {/* 1. BARRA SUPERIOR */}
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

        {/* 2. HEADER PRINCIPAL */}
        <div className="max-w-[1920px] mx-auto w-full px-4 lg:px-6 py-4 lg:py-5 flex items-center justify-between gap-4 lg:gap-12 relative bg-[#050505]">
          
          <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-white p-2 -ml-2 hover:bg-white/10 rounded-md active:scale-95 transition-transform">
            <Menu size={24} />
          </button>

          <Link href="/" className="shrink-0 relative z-10 group flex items-center gap-3 lg:gap-5">
              <div className="relative h-10 w-10 lg:h-20 lg:w-20 flex items-center justify-center">
                  <Image src="/coyotelogo.svg" alt="Coyote" fill className="object-contain" priority />
              </div>
              <div className="flex flex-col justify-center border-l-2 border-white/10 pl-3 lg:pl-5 py-1">
                  <h1 className="text-2xl lg:text-5xl font-[1000] text-[#FDCB02] uppercase leading-[0.8] tracking-[-0.06em] italic">COYOTE</h1>
                  <h2 className="text-[10px] lg:text-[14px] font-[900] text-white uppercase leading-none tracking-[0.25em] lg:tracking-[0.45em] mt-1 lg:mt-1.5 ml-0.5">TEXTIL</h2>
              </div>
          </Link>

          {/* BUSCADOR DUAL */}
          <div className="flex-1 hidden lg:flex max-w-2xl relative z-20">
              <form onSubmit={onSearchSubmit} className={`w-full flex h-[52px] bg-[#111] border rounded-sm transition-all overflow-hidden ${searchMode === 'ia' ? 'border-[#FDCB02] ring-1 ring-[#FDCB02]' : 'border-white/10'}`}>
                  <div 
                    className="flex items-center px-5 bg-[#1a1a1a] border-r border-white/10 cursor-pointer hover:bg-[#222] transition-colors group" 
                    onClick={() => {
                      setSearchMode(searchMode === 'sku' ? 'ia' : 'sku')
                      setIsAIResultsOpen(false)
                    }}
                  >
                      <div className="flex flex-col items-center justify-center w-16">
                        {searchMode === 'ia' ? <Sparkles size={14} className="text-[#FDCB02] mb-0.5 animate-pulse" /> : <Package size={14} className="text-neutral-500 mb-0.5" />}
                        <span className={`text-[9px] font-[1000] uppercase tracking-tighter ${searchMode === 'ia' ? 'text-[#FDCB02]' : 'text-neutral-400'}`}>
                          {searchMode === 'sku' ? 'MODO SKU' : 'MODO IA'}
                        </span>
                      </div>
                      <ChevronDown size={12} className="text-neutral-600 ml-1 group-hover:text-white transition-colors"/>
                  </div>
                  
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={searchMode === 'ia' ? "Pregunta sobre rendimientos, precios o stock..." : "BUSCAR REFERENCIA / SKU..."} 
                    className="flex-1 bg-transparent px-6 text-[13px] font-bold text-white placeholder:text-neutral-700 focus:outline-none uppercase tracking-wider"
                  />
                  
                  <button type="submit" className="bg-[#FDCB02] hover:bg-[#ffe159] text-black px-7 flex items-center justify-center transition-colors">
                    {isLoading ? <Loader2 size={22} className="animate-spin" /> : <Search size={22} strokeWidth={3}/>}
                  </button>
              </form>

              {/* PANEL DE RESULTADOS IA */}
              {isAIResultsOpen && messages.length > 0 && (
                <div className="absolute top-full left-0 mt-3 w-full bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-4 border-b border-white/5 bg-black/40 flex justify-between items-center">
                    <span className="text-[10px] font-black text-[#FDCB02] uppercase tracking-[0.2em] flex items-center gap-2">
                      <Sparkles size={12} /> Coyote Intelligence
                    </span>
                    <button onClick={() => setIsAIResultsOpen(false)} className="text-neutral-500 hover:text-white"><X size={14}/></button>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto p-6 space-y-6">
                    {messages.map((m) => (
                      <div key={m.id} className={`flex gap-4 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed ${
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
                  <div className="p-4 bg-black/40 border-t border-white/5 flex justify-center">
                    <button 
                      onClick={() => { setMessages([]); setInput(''); setIsAIResultsOpen(false) }} 
                      className="text-[9px] font-black text-neutral-600 uppercase hover:text-white transition-colors"
                    >
                      Limpiar Consulta
                    </button>
                  </div>
                </div>
              )}
          </div>

          <div className="flex items-center gap-4 lg:gap-8 text-white ml-auto lg:ml-0">
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
                                <Link href="/perfil" className="flex items-center gap-3 px-5 py-3 text-[11px] font-bold text-neutral-400 hover:text-white hover:bg-white/5 uppercase tracking-widest transition-colors">
                                    <User size={14} className="text-[#FDCB02]"/> Mi Tablero / Perfil
                                </Link>
                                <Link href="/perfil" className="flex items-center gap-3 px-5 py-3 text-[11px] font-bold text-neutral-400 hover:text-white hover:bg-white/5 uppercase tracking-widest transition-colors">
                                    <Package size={14} className="text-[#FDCB02]"/> Mis Pedidos
                                </Link>
                                <Link href="/facturacion" className="flex items-center gap-3 px-5 py-3 text-[11px] font-bold text-neutral-400 hover:text-white hover:bg-white/5 uppercase tracking-widest transition-colors">
                                    <FileText size={14} className="text-[#FDCB02]"/> Datos Fiscales
                                </Link>
                            </div>
                            <button onClick={handleLogout} className="flex items-center gap-3 px-5 py-4 text-[11px] font-bold text-red-500 hover:text-red-400 hover:bg-red-500/10 uppercase tracking-widest transition-colors border-t border-white/5 text-left w-full">
                                <LogOut size={14} /> Cerrar Sesión
                            </button>
                        </div>
                    </div>
                 </div>
              ) : (
                <Link href="/cuenta" className="flex flex-col text-right group py-2">
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

        {/* 3. NAVEGACIÓN INFERIOR */}
        <div className="hidden lg:block border-t border-white/5 bg-[#080808] h-14 relative">
          <div className="max-w-[1920px] mx-auto w-full px-6 h-full flex items-center gap-12">
              <div className="relative h-full" onMouseEnter={() => setIsMenuOpen(true)} onMouseLeave={() => setIsMenuOpen(false)}>
                  <button className="flex items-center gap-4 h-full px-6 bg-white/5 hover:bg-[#FDCB02] hover:text-black transition-colors text-[11px] font-[1000] uppercase tracking-[0.25em] text-white border-r border-white/5 cursor-pointer">
                      <Menu size={18} strokeWidth={3}/> <span className="mt-0.5">Todos Nuestros Productos</span>
                  </button>
                  <div className={`absolute top-full left-0 w-[300px] bg-[#0a0a0a] border border-white/10 shadow-2xl transition-all duration-200 origin-top-left z-50 ${isMenuOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}`}>
                      <div className="py-2">
                          {categories.map((category) => (
                              <Link key={category} href={`/catalogo?categoria=${encodeURIComponent(category)}`} className="flex items-center gap-3 px-6 py-3 text-[11px] font-bold text-neutral-400 hover:text-white hover:bg-white/5 uppercase tracking-widest border-b border-white/5 last:border-0 transition-colors">
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

      {/* MÓVIL */}
      <div className={`fixed inset-0 z-[200] lg:hidden bg-[#050505] transition-all duration-300 ${mobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
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
        <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto">
            <form onSubmit={onSearchSubmit} className="relative shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18}/>
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  type="text" 
                  placeholder="PREGUNTA O BUSCA SKU..." 
                  className="w-full bg-[#111] border border-white/10 rounded-lg h-14 pl-12 pr-4 text-sm font-bold text-white uppercase focus:border-[#FDCB02] outline-none shadow-inner"
                />
            </form>
            <div className="grid grid-cols-2 gap-3 shrink-0">
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