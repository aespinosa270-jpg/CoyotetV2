"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Target, Ticket,
  PhoneCall, Users, ShoppingBag,
  Menu, X, LogOut, Bell, ChevronRight,
  MessageSquare, Wallet, Clock, UserPlus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EmployeeRole } from "@prisma/client";

type Employee = {
  id:    string;
  name:  string;
  email: string;
  role:  EmployeeRole;
};

const MENU = [
  { name: "Mi Dashboard",   icon: LayoutDashboard, href: "/crm/agente"               },
  { name: "Mi Pipeline",    icon: Target,          href: "/crm/agente/pipeline"      },
  { name: "Mis Clientes",   icon: Users,           href: "/crm/agente/clientes"      },
  { name: "Mis Tickets",    icon: Ticket,          href: "/crm/agente/tickets"       },
  { name: "Interacciones",  icon: PhoneCall,       href: "/crm/agente/interacciones" },
  { name: "Mis Pedidos",    icon: ShoppingBag,     href: "/crm/agente/pedidos"       },
  { name: "WhatsApp",       icon: MessageSquare,   href: "/crm/agente/whatsapp"      },
  { name: "Mi Wallet",      icon: Wallet,          href: "/crm/agente/wallet"        },
  { name: "Checador",       icon: Clock,           href: "/crm/agente/checador"      },
  { name: "Nuevo Cliente",  icon: UserPlus,        href: "/crm/agente/onboarding"    },
];

const ROLE_LABEL: Record<EmployeeRole, string> = {
  ADMIN:        "Administrador",
  SUPERVISOR:   "Supervisor",
  VENDEDORA:    "Vendedora",
  LOGISTICA:    "Logística",
  CONTABILIDAD: "Contabilidad",
};

export default function AgentLayoutClient({
  children,
  employee,
  notifCount,
}: {
  children:   React.ReactNode;
  employee:   Employee;
  notifCount: number;
}) {
  const pathname    = usePathname();
  const router      = useRouter();
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const initials = employee.name
    .split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = (href: string) =>
    href === "/crm/agente"
      ? pathname === "/crm/agente"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    // 🏢 FONDO CLARO CORPORATIVO Y TEXTO NEGRO
    <div className="flex h-screen bg-[#F8F9FA] text-black overflow-hidden font-sans">

      {/* Overlay móvil */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── SIDEBAR (Blanco con acentos limpios) ── */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-60 flex flex-col
        bg-white border-r border-gray-200 shadow-sm
        transition-transform duration-300
        ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>

        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-400">Portal</p>
            <h1 className="text-base font-[1000] uppercase tracking-tighter text-black leading-none">
              COYOTE <span className="text-[#FDCB02]">CRM</span>
            </h1>
          </div>
          <button className="md:hidden" onClick={() => setMobileOpen(false)}>
            <X size={16} className="text-gray-400 hover:text-black" />
          </button>
        </div>

        {/* Perfil compacto */}
        <div className="px-4 py-4 border-b border-gray-100 shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-black text-[#FDCB02] text-xs font-black flex items-center justify-center shrink-0 shadow-sm">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-black truncate">{employee.name}</p>
              <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">
                {ROLE_LABEL[employee.role]}
              </p>
            </div>
            <span className="relative flex h-1.5 w-1.5 ml-auto shrink-0">
              <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 [&::-webkit-scrollbar]:w-0">

          {/* Sección principal */}
          <p className="text-[8px] font-black uppercase tracking-[0.25em] text-gray-400 mb-3 px-2">
            Mi Espacio
          </p>
          <div className="flex flex-col gap-0.5 mb-4">
            {MENU.slice(0, 6).map((item) => {
              const active = isActive(item.href);
              return (
                <button key={item.name}
                  onClick={() => { router.push(item.href); setMobileOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all ${
                    active
                      ? "bg-[#FDCB02] text-black shadow-sm"
                      : "text-gray-600 hover:text-black hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon size={13} className={active ? "text-black" : "text-gray-400"} />
                    {item.name}
                  </div>
                  {item.href === "/crm/agente/tickets" && notifCount > 0 && (
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                      active ? "bg-black/20 text-black" : "bg-red-500 text-white shadow-sm"
                    }`}>
                      {notifCount}
                    </span>
                  )}
                  {active && <ChevronRight size={11} className="text-black/40 ml-auto" />}
                </button>
              );
            })}
          </div>

          {/* Sección herramientas */}
          <p className="text-[8px] font-black uppercase tracking-[0.25em] text-gray-400 mb-3 px-2">
            Herramientas
          </p>
          <div className="flex flex-col gap-0.5">
            {MENU.slice(6).map((item) => {
              const active = isActive(item.href);
              const isWA   = item.href === "/crm/agente/whatsapp";
              return (
                <button key={item.name}
                  onClick={() => { router.push(item.href); setMobileOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all ${
                    active
                      ? isWA
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-[#FDCB02] text-black shadow-sm"
                      : "text-gray-600 hover:text-black hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon size={13} className={active ? (isWA ? "text-white" : "text-black") : "text-gray-400"} />
                    {item.name}
                  </div>
                  {active && <ChevronRight size={11} className={isWA ? "text-white/60 ml-auto" : "text-black/40 ml-auto"} />}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-100 shrink-0 bg-gray-50/50">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
          >
            <LogOut size={13} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ── ÁREA PRINCIPAL ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F8F9FA]">

        {/* Navbar (Clara) */}
        <header className="h-16 border-b border-gray-200 bg-white/90 backdrop-blur-md flex items-center justify-between px-4 md:px-6 shrink-0 z-30">
          <div className="flex items-center gap-4">
            <button className="md:hidden" onClick={() => setMobileOpen(true)}>
              <Menu size={20} className="text-gray-600" />
            </button>
            <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              <span>CRM</span>
              <ChevronRight size={10} />
              <span className="text-black">
                {MENU.find((m) => isActive(m.href))?.name ?? "Dashboard"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Bell */}
            <Link href="/crm/agente/tickets" className="relative text-gray-500 hover:text-black transition-colors">
              <Bell size={17} />
              {notifCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[7px] font-black text-white shadow-sm">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </Link>

            <div className="w-px h-5 bg-gray-200" />

            {/* Avatar dropdown */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen((p) => !p)}
                className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
              >
                <div className="hidden md:block text-right">
                  <p className="text-[10px] font-bold text-black uppercase tracking-wider leading-none">
                    {employee.name.split(" ")[0]}
                  </p>
                  <p className="text-[9px] text-gray-500 font-bold mt-0.5">
                    {ROLE_LABEL[employee.role]}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-black text-[#FDCB02] flex items-center justify-center font-black text-xs shadow-sm">
                  {initials}
                </div>
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div key="dd"
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 mt-3 w-48 bg-white border border-gray-200 rounded-2xl shadow-xl py-2 z-50"
                  >
                    <div className="px-4 py-3 border-b border-gray-100 mb-1">
                      <p className="text-xs font-bold text-black">{employee.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{employee.email}</p>
                    </div>
                    <Link href="/crm/agente/checador"
                      onClick={() => setProfileOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] text-gray-600 hover:bg-gray-50 hover:text-black font-bold uppercase tracking-widest transition-colors"
                    >
                      <Clock size={13} className="text-gray-400" /> Mi Checador
                    </Link>
                    <Link href="/crm/agente/wallet"
                      onClick={() => setProfileOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] text-gray-600 hover:bg-gray-50 hover:text-black font-bold uppercase tracking-widest transition-colors"
                    >
                      <Wallet size={13} className="text-gray-400" /> Mi Wallet
                    </Link>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] text-red-600 hover:bg-red-50 font-bold uppercase tracking-widest transition-colors"
                    >
                      <LogOut size={13} /> Cerrar Sesión
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F8F9FA] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
          {children}
        </div>
      </main>
    </div>
  );
}