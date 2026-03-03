"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, Target, Ticket,
  MessageSquare, Clock, BarChart, Settings,
  Search, Bell, Menu, X, ChevronDown, LogOut,
  User, Package, Warehouse, Truck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// MENÚ — rutas canónicas y consistentes con el filesystem de Next.js
// ─────────────────────────────────────────────────────────────────────────────
const menuItems = [
  { name: "Dashboard",       icon: LayoutDashboard, href: "/crm/admin" },
  { name: "Agentes",         icon: Users,           href: "/crm/admin/agentes" },
  {
    name: "Leads / Ventas",  icon: Target,          href: "/crm/admin/leads",
    submenus: [
      { name: "Pipeline General", href: "/crm/admin/leads" },
      { name: "Asignados",        href: "/crm/admin/leads/asignados" },
      { name: "Cerrados",         href: "/crm/admin/leads/cerrados" },
    ],
  },
  {
    name: "Tickets / Soporte", icon: Ticket,        href: "/crm/admin/tickets",
    submenus: [
      { name: "Abiertos",    href: "/crm/admin/tickets" },
      { name: "Pendientes",  href: "/crm/admin/tickets/pendientes" },
      { name: "Cerrados",    href: "/crm/admin/tickets/cerrados" },
    ],
  },
  {
    name: "Interacciones",   icon: MessageSquare,   href: "/crm/admin/interacciones",
    submenus: [
      { name: "Registro Global", href: "/crm/admin/interacciones" },
      { name: "Llamadas (PBX)",  href: "/crm/admin/llamadas" },
    ],
  },
  { name: "Clientes",        icon: Users,           href: "/crm/admin/clientes" },
  // Catálogo de productos (definición de telas, SKUs, precios)
  { name: "Catálogo",        icon: Package,         href: "/crm/admin/productos" },
  // Inventario / Kardex (stock real, movimientos, historial)
  {
    name: "Inventario",      icon: Warehouse,       href: "/crm/admin/inventario",
    submenus: [
      { name: "Stock Actual",   href: "/crm/admin/inventario" },
      { name: "Mov. Entrada",   href: "/crm/admin/inventario/movimiento" },
      { name: "Historial",      href: "/crm/admin/inventario/historial" },
    ],
  },
  {
    name: "Flotilla / Rutas", icon: Truck,          href: "/crm/admin/flotilla",
    submenus: [
      { name: "Vehículos",      href: "/crm/admin/flotilla" },
      { name: "Rutas del Día",  href: "/crm/admin/flotilla/rutas" },
    ],
  },
  {
    name: "Horarios",        icon: Clock,           href: "/crm/admin/horarios",
    submenus: [
      { name: "Hoy",     href: "/crm/admin/horarios" },
      { name: "Semanal", href: "/crm/admin/horarios/semana" },
    ],
  },
  { name: "Reportes",        icon: BarChart,        href: "/crm/admin/reportes" },
  { name: "Configuración",   icon: Settings,        href: "/crm/admin/configuracion" },
];

// ─────────────────────────────────────────────────────────────────────────────
// HOOK — detecta si una ruta está activa sin usar window
// ─────────────────────────────────────────────────────────────────────────────
function useIsActive(href: string) {
  const pathname = usePathname();
  // Exact match para el dashboard, prefix match para el resto
  if (href === "/crm/admin") return pathname === "/crm/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [isMobileOpen,  setIsMobileOpen]  = useState(false);
  const [openSubmenu,   setOpenSubmenu]   = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Logout centralizado — un solo lugar
  const handleLogout = () => signOut({ callbackUrl: "/login" });

  const toggleSubmenu = (name: string) =>
    setOpenSubmenu((prev) => (prev === name ? null : name));

  return (
    <div className="flex h-screen bg-[#030303] text-white overflow-hidden selection:bg-[#FDCB02] selection:text-black font-sans">

      {/* ── OVERLAY MÓVIL ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── SIDEBAR ───────────────────────────────────────────────────────── */}
      {/*
        En desktop: siempre visible (static).
        En móvil: se desliza como drawer (fixed + translate).
        Evitamos window.innerWidth por completo — puro CSS/Tailwind.
      */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-72 bg-[#050505] border-r border-white/10
          flex flex-col shadow-2xl md:shadow-none
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-[#0a0a0a] shrink-0">
          <h1 className="text-xl font-[1000] uppercase tracking-tighter text-white">
            COYOTE <span className="text-[#FDCB02]">ADMIN</span>
          </h1>
          <button
            className="md:hidden text-white hover:text-[#FDCB02] transition-colors"
            onClick={() => setIsMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 scrollbar-hide">
          <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600 mb-4 block px-2">
            Gestión Operativa Central
          </span>

          <div className="flex flex-col gap-1">
            {menuItems.map((item) => {
              const hasSubmenu = !!item.submenus?.length;

              // El item está activo si su ruta coincide (exacta para /crm/admin)
              const isItemActive = item.href === "/crm/admin"
                ? pathname === "/crm/admin"
                : pathname === item.href || pathname.startsWith(item.href + "/");

              // El submenú está abierto si el usuario lo abrió manualmente
              // O si la ruta actual vive dentro de él (para que no colapse al navegar)
              const isSubmenuOpen =
                openSubmenu === item.name || (isItemActive && hasSubmenu);

              return (
                <div key={item.name}>
                  <button
                    onClick={() =>
                      hasSubmenu
                        ? toggleSubmenu(item.name)
                        : (router.push(item.href), setIsMobileOpen(false))
                    }
                    className={`
                      w-full flex items-center justify-between
                      px-3 py-3 rounded-lg font-bold text-xs uppercase tracking-wider
                      transition-all
                      ${isItemActive && !hasSubmenu
                        ? "bg-[#FDCB02] text-black"
                        : isItemActive && hasSubmenu
                        ? "text-[#FDCB02] bg-white/5"
                        : "text-neutral-400 hover:text-white hover:bg-white/5"}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon
                        size={16}
                        className={
                          isItemActive && !hasSubmenu ? "text-black" : ""
                        }
                      />
                      {item.name}
                    </div>
                    {hasSubmenu && (
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-300 ${
                          isSubmenuOpen ? "rotate-180 text-[#FDCB02]" : "text-neutral-600"
                        }`}
                      />
                    )}
                  </button>

                  {/* Submenús */}
                  <AnimatePresence initial={false}>
                    {hasSubmenu && isSubmenuOpen && (
                      <motion.div
                        key="submenu"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-9 mt-1 flex flex-col gap-0.5 border-l border-white/10 pl-3 py-1">
                          {item.submenus!.map((sub) => {
                            const isSubActive = pathname === sub.href;
                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={`
                                  px-3 py-2 text-[10px] font-bold uppercase tracking-widest
                                  rounded-md transition-colors
                                  ${isSubActive
                                    ? "text-[#FDCB02] bg-white/5"
                                    : "text-neutral-500 hover:text-white hover:bg-white/5"}
                                `}
                              >
                                {sub.name}
                              </Link>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 shrink-0">
          <div className="bg-[#111] border border-white/5 p-3 rounded-lg flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-mono text-neutral-400 uppercase">Admin Activo</span>
          </div>
        </div>
      </aside>

      {/* ── ÁREA PRINCIPAL ────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* NAVBAR */}
        <header className="h-16 border-b border-white/10 bg-[#050505]/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 z-40 sticky top-0 shrink-0">

          <div className="flex items-center gap-4">
            {/* Hamburger — solo móvil */}
            <button
              className="md:hidden text-white hover:text-[#FDCB02] transition-colors"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={24} />
            </button>

            {/* Buscador */}
            <div className="hidden md:flex items-center relative">
              <Search size={14} className="absolute left-3 text-neutral-500" />
              <input
                type="text"
                placeholder="Buscar lead, ticket, agente..."
                className="bg-[#111] border border-white/10 text-white text-xs font-mono px-9 py-2 rounded-md focus:outline-none focus:border-[#FDCB02]/50 transition-colors w-72"
              />
              <span className="absolute right-3 text-[9px] text-neutral-600 font-bold border border-white/10 px-1.5 rounded">
                ⌘K
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Notificaciones */}
            <button className="relative text-neutral-400 hover:text-white transition-colors">
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 border-2 border-[#050505] rounded-full flex items-center justify-center text-[7px] font-black text-white">
                3
              </span>
            </button>

            <div className="w-px h-6 bg-white/10 hidden md:block" />

            {/* Avatar + dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen((p) => !p)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="text-right hidden md:block">
                  <p className="text-xs font-bold text-white uppercase tracking-wider leading-none">
                    Dirección
                  </p>
                  <p className="text-[9px] text-[#FDCB02] font-mono mt-1">Nivel Dios</p>
                </div>
                <div className="w-9 h-9 rounded-md bg-[#FDCB02] text-black flex items-center justify-center font-black text-xs uppercase shadow-[0_0_15px_rgba(253,203,2,0.2)]">
                  DR
                </div>
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    key="profile-dropdown"
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-3 w-48 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl py-2 overflow-hidden"
                  >
                    <Link
                      href="/crm/admin/perfil"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-xs text-neutral-400 hover:text-white hover:bg-white/5 font-bold uppercase tracking-widest transition-colors"
                    >
                      <User size={14} /> Mi Perfil
                    </Link>
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

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#030303]">
          {children}
        </div>
      </main>
    </div>
  );
}