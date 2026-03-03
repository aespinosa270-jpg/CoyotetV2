"use client"

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react"; // 🔥 Importamos la extracción táctica
import { 
  LayoutDashboard, Users, Target, Ticket, 
  MessageSquare, Clock, BarChart, Settings, 
  Search, Bell, Menu, X, ChevronDown, LogOut, User, Package
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- ESTRUCTURA DEL MENÚ ADMIN ---
const menuItems = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/crm/admin" },
  { name: "Agentes", icon: Users, href: "/crm/admin/agentes" },
  { 
    name: "Leads / Ventas", icon: Target, href: "/crm/admin/leads",
    submenus: [
      { name: "Pipeline General", href: "/crm/admin/leads" },
      { name: "Asignados", href: "/crm/admin/leads/asignados" },
      { name: "Cerrados", href: "/crm/admin/leads/cerrados" }
    ]
  },
  { 
    name: "Tickets / Soporte", icon: Ticket, href: "/crm/admin/tickets",
    submenus: [
      { name: "Abiertos", href: "/crm/admin/tickets" },
      { name: "Pendientes", href: "/crm/admin/tickets/pendientes" },
      { name: "Cerrados", href: "/crm/admin/tickets/cerrados" }
    ]
  },
  { 
    name: "Interacciones", icon: MessageSquare, href: "/crm/admin/interacciones",
    submenus: [
      { name: "Registro Global", href: "/crm/admin/interacciones" },
      { name: "Llamadas (PBX)", href: "/crm/admin/llamadas" }
    ]
  },
  { name: "Base de Clientes", icon: Users, href: "/crm/admin/clientes" },
  // 🔥 CORREGÍ LA RUTA PARA QUE VAYA AL CATÁLOGO QUE ACABAMOS DE ARMAR
  { name: "Catálogo / Bodega", icon: Package, href: "/crm/admin/productos" }, 
  { 
    name: "Horarios", icon: Clock, href: "/crm/admin/horarios",
    submenus: [
      { name: "Hoy", href: "/crm/admin/horarios" },
      { name: "Semanal", href: "/crm/admin/horarios/semana" }
    ]
  },
  { name: "Reportes", icon: BarChart, href: "/crm/admin/reportes" },
  { name: "Configuración", icon: Settings, href: "/crm/admin/configuracion" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const toggleSubmenu = (name: string) => {
    setOpenSubmenu(openSubmenu === name ? null : name);
  };

  // 🔥 FUNCIÓN DE CIERRE DE SESIÓN
  const handleLogout = async () => {
    // Si usas NextAuth:
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="flex h-screen bg-[#030303] text-white overflow-hidden selection:bg-[#FDCB02] selection:text-black font-sans">
      
      {/* 1. SIDEBAR IZQUIERDA */}
      <AnimatePresence>
        {(isMobileOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
          <motion.aside 
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed md:static inset-y-0 left-0 z-50 w-72 bg-[#050505] border-r border-white/10 flex flex-col shadow-2xl md:shadow-none"
          >
            {/* Header Sidebar */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-[#0a0a0a]">
              <h1 className="text-xl font-[1000] uppercase tracking-tighter text-white">
                COYOTE <span className="text-[#FDCB02]">ADMIN</span>
              </h1>
              <button className="md:hidden text-white hover:text-[#FDCB02]" onClick={() => setIsMobileOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Menú de Navegación */}
            <div className="flex-1 overflow-y-auto py-6 px-4 scrollbar-hide">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600 mb-4 block px-2">Gestión Operativa Central</span>
              
              <nav className="flex flex-col gap-1">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  const hasSubmenu = item.submenus && item.submenus.length > 0;
                  const isSubmenuOpen = openSubmenu === item.name || isActive;

                  return (
                    <div key={item.name}>
                      <button 
                        onClick={() => hasSubmenu ? toggleSubmenu(item.name) : router.push(item.href)}
                        className={`w-full flex items-center justify-between px-3 py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${isActive && !hasSubmenu ? 'bg-[#FDCB02] text-black' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon size={16} className={isActive && !hasSubmenu ? "text-black" : "text-neutral-500"} />
                          {item.name}
                        </div>
                        {hasSubmenu && <ChevronDown size={14} className={`transition-transform duration-300 ${isSubmenuOpen ? 'rotate-180 text-white' : 'text-neutral-600'}`} />}
                      </button>

                      {/* Submenús animables */}
                      {hasSubmenu && isSubmenuOpen && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          className="ml-9 mt-1 flex flex-col gap-1 border-l border-white/10 pl-3 py-1"
                        >
                          {item.submenus.map((sub) => (
                            <Link 
                              key={sub.name} 
                              href={sub.href}
                              onClick={() => setIsMobileOpen(false)}
                              className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md transition-colors ${pathname === sub.href ? 'text-[#FDCB02] bg-white/5' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}
                            >
                              {sub.name}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
            
            {/* Footer Sidebar */}
            <div className="p-4 border-t border-white/10">
              <div className="bg-[#111] border border-white/5 p-3 rounded-lg flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono text-neutral-400 uppercase">Admin Activo</span>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 2. ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        
        {/* NAVBAR SUPERIOR FIJA */}
        <header className="h-16 border-b border-white/10 bg-[#050505]/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 z-40 sticky top-0">
          
          <div className="flex items-center gap-4">
            <button className="md:hidden text-white hover:text-[#FDCB02]" onClick={() => setIsMobileOpen(true)}>
              <Menu size={24} />
            </button>
            
            {/* Buscador Global */}
            <div className="hidden md:flex items-center relative">
              <Search size={14} className="absolute left-3 text-neutral-500" />
              <input 
                type="text" 
                placeholder="Buscar lead, ticket, agente..." 
                className="bg-[#111] border border-white/10 text-white text-xs font-mono px-9 py-2 rounded-md focus:outline-none focus:border-[#FDCB02]/50 transition-colors w-72"
              />
              <span className="absolute right-3 text-[9px] text-neutral-600 font-bold border border-white/10 px-1.5 rounded">⌘ K</span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Alertas */}
            <button className="relative text-neutral-400 hover:text-white transition-colors">
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 border-2 border-[#050505] rounded-full flex items-center justify-center text-[7px] font-black text-white">3</span>
            </button>

            <div className="w-px h-6 bg-white/10 hidden md:block" />

            {/* Avatar & Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="text-right hidden md:block">
                  <p className="text-xs font-bold text-white uppercase tracking-wider leading-none">Dirección</p>
                  <p className="text-[9px] text-[#FDCB02] font-mono mt-1">Nivel Dios</p>
                </div>
                <div className="w-9 h-9 rounded-md bg-[#FDCB02] text-black flex items-center justify-center font-black text-xs uppercase shadow-[0_0_15px_rgba(253,203,2,0.2)]">
                  DR
                </div>
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-3 w-48 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl py-2 overflow-hidden"
                  >
                    <Link href="/crm/admin/perfil" className="flex items-center gap-3 px-4 py-2.5 text-xs text-neutral-400 hover:text-white hover:bg-white/5 font-bold uppercase tracking-widest transition-colors">
                      <User size={14} /> Mi Perfil
                    </Link>
                    {/* 🔥 BOTÓN CONECTADO AL LOGOUT REAL */}
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-rose-500 hover:bg-rose-500/10 font-bold uppercase tracking-widest transition-colors border-t border-white/5 mt-1"
                    >
                      <LogOut size={14} /> Cerrar Sesión
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* CONTENIDO DE LA VISTA (Aquí se inyectan las páginas del Admin) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative bg-[#030303] z-0">
          {children}
        </div>
      </main>

    </div>
  );
}