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
    <div className="flex h-screen bg-[#030303] text-white overflow-hidden font-sans">

      {/* Overlay móvil */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-60 flex flex-col
        bg-[#050505] border-r border-white/[0.05]
        transition-transform duration-300
        ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>

        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/[0.05] shrink-0">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-600">Portal</p>
            <h1 className="text-base font-[1000] uppercase tracking-tighter text-white leading-none">
              COYOTE <span className="text-[#FDCB02]">CRM</span>
            </h1>
          </div>
          <button className="md:hidden" onClick={() => setMobileOpen(false)}>
            <X size={16} className="text-zinc-500" />
          </button>
        </div>

        {/* Perfil compacto */}
        <div className="px-4 py-4 border-b border-white/[0.04] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FDCB02] text-black text-xs font-black flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{employee.name}</p>
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest">
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
          <p className="text-[8px] font-black uppercase tracking-[0.25em] text-zinc-700 mb-3 px-2">
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
                      ? "bg-[#FDCB02] text-black"
                      : "text-zinc-500 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon size={13} className={active ? "text-black" : ""} />
                    {item.name}
                  </div>
                  {item.href === "/crm/agente/tickets" && notifCount > 0 && (
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                      active ? "bg-black/20 text-black" : "bg-red-500 text-white"
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
          <p className="text-[8px] font-black uppercase tracking-[0.25em] text-zinc-700 mb-3 px-2">
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
                        ? "bg-emerald-500 text-black"
                        : "bg-[#FDCB02] text-black"
                      : "text-zinc-500 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon size={13} className={active ? "text-black" : isWA ? "text-emerald-400" : ""} />
                    {item.name}
                  </div>
                  {active && <ChevronRight size={11} className="text-black/40 ml-auto" />}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/[0.05] shrink-0">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-zinc-600 hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            <LogOut size={13} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ── ÁREA PRINCIPAL ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Navbar */}
        <header className="h-16 border-b border-white/[0.05] bg-[#050505]/90 backdrop-blur-md flex items-center justify-between px-4 md:px-6 shrink-0 z-30">
          <div className="flex items-center gap-4">
            <button className="md:hidden" onClick={() => setMobileOpen(true)}>
              <Menu size={20} className="text-zinc-400" />
            </button>
            <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              <span>CRM</span>
              <ChevronRight size={10} />
              <span className="text-white">
                {MENU.find((m) => isActive(m.href))?.name ?? "Dashboard"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Bell */}
            <Link href="/crm/agente/tickets" className="relative text-zinc-500 hover:text-white transition-colors">
              <Bell size={17} />
              {notifCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 border-2 border-[#050505] rounded-full flex items-center justify-center text-[7px] font-black text-white">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </Link>

            <div className="w-px h-5 bg-white/[0.06]" />

            {/* Avatar dropdown */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen((p) => !p)}
                className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
              >
                <div className="hidden md:block text-right">
                  <p className="text-[10px] font-bold text-white uppercase tracking-wider leading-none">
                    {employee.name.split(" ")[0]}
                  </p>
                  <p className="text-[9px] text-[#FDCB02] font-mono mt-0.5">
                    {ROLE_LABEL[employee.role]}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[#FDCB02] text-black flex items-center justify-center font-black text-xs shadow-[0_0_12px_rgba(253,203,2,0.15)]">
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
                    className="absolute right-0 mt-3 w-48 bg-[#0a0a0a] border border-zinc-800 rounded-2xl shadow-2xl py-2 z-50"
                  >
                    <div className="px-4 py-3 border-b border-zinc-800 mb-1">
                      <p className="text-xs font-bold text-white">{employee.name}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{employee.email}</p>
                    </div>
                    <Link href="/crm/agente/checador"
                      onClick={() => setProfileOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] text-zinc-400 hover:bg-white/[0.04] font-bold uppercase tracking-widest transition-colors"
                    >
                      <Clock size={13} /> Mi Checador
                    </Link>
                    <Link href="/crm/agente/wallet"
                      onClick={() => setProfileOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] text-zinc-400 hover:bg-white/[0.04] font-bold uppercase tracking-widest transition-colors"
                    >
                      <Wallet size={13} /> Mi Wallet
                    </Link>
                    <div className="border-t border-zinc-800 my-1" />
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] text-red-500 hover:bg-red-500/10 font-bold uppercase tracking-widest transition-colors"
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
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#030303] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
          {children}
        </div>
      </main>
    </div>
  );
}