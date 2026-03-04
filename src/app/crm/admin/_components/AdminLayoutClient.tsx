"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, Target, Ticket,
  MessageSquare, Clock, BarChart, Settings,
  Search, Bell, Menu, X, ChevronDown, LogOut,
  User, Package, Warehouse, Truck, AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EmployeeRole } from "@prisma/client";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Employee = {
  id:    string;
  name:  string;
  email: string;
  role:  EmployeeRole;
} | null;

// ─── Menú ─────────────────────────────────────────────────────────────────────
const menuItems = [
  { name: "Dashboard",         icon: LayoutDashboard, href: "/crm/admin" },
  { name: "Agentes",           icon: Users,           href: "/crm/admin/agentes" },
  {
    name: "Leads / Ventas",    icon: Target,          href: "/crm/admin/leads",
    submenus: [
      { name: "Pipeline General", href: "/crm/admin/leads"           },
      { name: "Asignados",        href: "/crm/admin/leads/asignados" },
      { name: "Cerrados",         href: "/crm/admin/leads/cerrados"  },
    ],
  },
  {
    name: "Tickets / Soporte", icon: Ticket,          href: "/crm/admin/tickets",
    submenus: [
      { name: "Abiertos",   href: "/crm/admin/tickets/abiertos"   },
      { name: "Pendientes", href: "/crm/admin/tickets/pendientes" },
      { name: "Cerrados",   href: "/crm/admin/tickets/cerrados"   },
    ],
  },
  { name: "Interacciones",     icon: MessageSquare,   href: "/crm/admin/interacciones" },
  { name: "Clientes",          icon: Users,           href: "/crm/admin/clientes"      },
  { name: "Catálogo",          icon: Package,         href: "/crm/admin/productos"     },
  {
    name: "Inventario",        icon: Warehouse,       href: "/crm/admin/inventario",
    submenus: [
      { name: "Stock Actual",  href: "/crm/admin/inventario"           },
      { name: "Mov. Entrada",  href: "/crm/admin/inventario/movimiento"},
      { name: "Historial",     href: "/crm/admin/inventario/historial" },
    ],
  },
  {
    name: "Flotilla / Rutas",  icon: Truck,           href: "/crm/admin/flotilla",
    submenus: [
      { name: "Vehículos",    href: "/crm/admin/flotilla"      },
      { name: "Rutas del Día",href: "/crm/admin/flotilla/rutas"},
    ],
  },
  {
    name: "Horarios",          icon: Clock,           href: "/crm/admin/horarios",
    submenus: [
      { name: "Hoy",     href: "/crm/admin/horarios"        },
      { name: "Semanal", href: "/crm/admin/horarios/semana" },
    ],
  },
  { name: "Reportes",       icon: BarChart,   href: "/crm/admin/reportes"      },
  { name: "Configuración",  icon: Settings,   href: "/crm/admin/configuracion" },
];

// ─── Búsqueda global ──────────────────────────────────────────────────────────
type SearchResult = {
  id:    string;
  label: string;
  sub:   string;
  href:  string;
  type:  "ticket" | "cliente" | "deal" | "producto";
};

function GlobalSearch() {
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<SearchResult[]>([]);
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [, startT]              = useTransition();
  const ref                     = useRef<HTMLDivElement>(null);
  const router                  = useRouter();

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Atajos de teclado ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        (ref.current?.querySelector("input") as HTMLInputElement)?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    setOpen(true);

    try {
      const res  = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(href);
  };

  const TYPE_COLORS = {
    ticket:   "text-rose-400",
    cliente:  "text-[#FDCB02]",
    deal:     "text-emerald-400",
    producto: "text-sky-400",
  };

  return (
    <div ref={ref} className="relative hidden md:block">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => query.length >= 2 && setOpen(true)}
        placeholder="Buscar lead, ticket, cliente..."
        className="bg-zinc-900 border border-zinc-800 text-white text-xs font-mono px-9 py-2 rounded-lg focus:outline-none focus:border-[#FDCB02]/50 transition-colors w-72 placeholder:text-zinc-600"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-zinc-600 font-bold border border-zinc-800 px-1.5 py-0.5 rounded pointer-events-none">
        ⌘K
      </span>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {loading && (
              <div className="px-4 py-3 text-[10px] text-zinc-600 uppercase tracking-widest">
                Buscando...
              </div>
            )}
            {!loading && results.length === 0 && (
              <div className="px-4 py-3 text-[10px] text-zinc-700 uppercase tracking-widest">
                Sin resultados para "{query}"
              </div>
            )}
            {!loading && results.map((r) => (
              <button key={r.id} onClick={() => handleSelect(r.href)}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left border-b border-white/[0.03] last:border-0"
              >
                <span className={`text-[8px] font-black uppercase tracking-widest pt-0.5 w-14 shrink-0 ${TYPE_COLORS[r.type]}`}>
                  {r.type}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{r.label}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{r.sub}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Role labels ──────────────────────────────────────────────────────────────
const ROLE_LABEL: Record<EmployeeRole, string> = {
  ADMIN:        "Administrador",
  SUPERVISOR:   "Supervisor",
  VENDEDORA:    "Vendedora",
  LOGISTICA:    "Logística",
  CONTABILIDAD: "Contabilidad",
};

// ─── Layout principal ─────────────────────────────────────────────────────────
export default function AdminLayoutClient({
  children,
  employee,
  notifCount,
}: {
  children:   React.ReactNode;
  employee:   Employee;
  notifCount: number;
}) {
  const pathname       = usePathname();
  const router         = useRouter();
  const [isMobileOpen,  setIsMobileOpen]  = useState(false);
  const [openSubmenu,   setOpenSubmenu]   = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => signOut({ callbackUrl: "/login" });

  // Cerrar dropdown profile al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleSubmenu = (name: string) =>
    setOpenSubmenu((prev) => (prev === name ? null : name));

  // Iniciales del empleado
  const initials = employee
    ? employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    <div className="flex h-screen bg-[#030303] text-white overflow-hidden selection:bg-[#FDCB02] selection:text-black font-sans">

      {/* Overlay móvil */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-[#050505] border-r border-white/[0.06]
        flex flex-col shadow-2xl md:shadow-none
        transition-transform duration-300 ease-in-out
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/[0.06] shrink-0">
          <h1 className="text-lg font-[1000] uppercase tracking-tighter text-white">
            COYOTE <span className="text-[#FDCB02]">ADMIN</span>
          </h1>
          <button className="md:hidden text-white hover:text-[#FDCB02] transition-colors"
            onClick={() => setIsMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-5 px-3
          [&::-webkit-scrollbar]:w-0">
          <p className="text-[8px] font-black uppercase tracking-[0.25em] text-zinc-700 mb-3 px-2">
            Gestión Operativa
          </p>
          <div className="flex flex-col gap-0.5">
            {menuItems.map((item) => {
              const hasSubmenu  = !!item.submenus?.length;
              const isItemActive = item.href === "/crm/admin"
                ? pathname === "/crm/admin"
                : pathname === item.href || pathname.startsWith(item.href + "/");
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
                      px-3 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider
                      transition-all
                      ${isItemActive && !hasSubmenu
                        ? "bg-[#FDCB02] text-black"
                        : isItemActive && hasSubmenu
                        ? "text-[#FDCB02] bg-white/[0.04]"
                        : "text-zinc-500 hover:text-white hover:bg-white/[0.04]"}
                    `}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon size={14} className={isItemActive && !hasSubmenu ? "text-black" : ""} />
                      {item.name}
                    </div>
                    {hasSubmenu && (
                      <ChevronDown size={12} className={`transition-transform duration-200 ${
                        isSubmenuOpen ? "rotate-180 text-[#FDCB02]" : "text-zinc-700"
                      }`} />
                    )}
                  </button>

                  <AnimatePresence initial={false}>
                    {hasSubmenu && isSubmenuOpen && (
                      <motion.div key="sub"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-8 mt-0.5 flex flex-col gap-0.5 border-l border-white/[0.06] pl-3 py-1">
                          {item.submenus!.map((sub) => {
                            const isSubActive = pathname === sub.href;
                            return (
                              <Link key={sub.href} href={sub.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={`px-3 py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-colors ${
                                  isSubActive
                                    ? "text-[#FDCB02] bg-white/[0.04]"
                                    : "text-zinc-600 hover:text-white hover:bg-white/[0.03]"
                                }`}
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

        {/* Footer sidebar — perfil del empleado */}
        <div className="p-3 border-t border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-zinc-900/60">
            <div className="w-7 h-7 rounded-lg bg-[#FDCB02] text-black text-[9px] font-black flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-zinc-200 truncate">{employee?.name ?? "Admin"}</p>
              <p className="text-[8px] text-zinc-600 uppercase tracking-widest truncate">
                {employee ? ROLE_LABEL[employee.role] : "—"}
              </p>
            </div>
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
          </div>
        </div>
      </aside>

      {/* ── ÁREA PRINCIPAL ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* NAVBAR */}
        <header className="h-16 border-b border-white/[0.06] bg-[#050505]/90 backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-40 sticky top-0 shrink-0">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-white hover:text-[#FDCB02] transition-colors"
              onClick={() => setIsMobileOpen(true)}>
              <Menu size={22} />
            </button>
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-4">
            {/* Bell con badge real */}
            <Link href="/crm/admin/tickets/abiertos" className="relative text-zinc-500 hover:text-white transition-colors">
              <Bell size={17} />
              {notifCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 border-2 border-[#050505] rounded-full flex items-center justify-center text-[7px] font-black text-white">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </Link>

            <div className="w-px h-5 bg-white/[0.08] hidden md:block" />

            {/* Avatar + dropdown */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setIsProfileOpen((p) => !p)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="text-right hidden md:block">
                  <p className="text-[10px] font-bold text-white uppercase tracking-wider leading-none">
                    {employee?.name?.split(" ")[0] ?? "Admin"}
                  </p>
                  <p className="text-[9px] text-[#FDCB02] font-mono mt-0.5">
                    {employee ? ROLE_LABEL[employee.role] : "—"}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[#FDCB02] text-black flex items-center justify-center font-black text-xs uppercase shadow-[0_0_12px_rgba(253,203,2,0.15)]">
                  {initials}
                </div>
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div key="profile-dd"
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 mt-3 w-52 bg-[#0a0a0a] border border-zinc-800 rounded-2xl shadow-2xl py-2 overflow-hidden z-50"
                  >
                    {/* Info empleado */}
                    <div className="px-4 py-3 border-b border-zinc-800 mb-1">
                      <p className="text-xs font-bold text-white">{employee?.name}</p>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5">{employee?.email}</p>
                    </div>

                    <Link href="/crm/admin/configuracion"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-[10px] text-zinc-400 hover:text-white hover:bg-white/[0.04] font-bold uppercase tracking-widest transition-colors"
                    >
                      <User size={13} /> Mi Perfil
                    </Link>
                    <Link href="/crm/admin/tickets/abiertos"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center justify-between px-4 py-2.5 text-[10px] text-zinc-400 hover:text-white hover:bg-white/[0.04] font-bold uppercase tracking-widest transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <AlertTriangle size={13} /> Tickets Urgentes
                      </span>
                      {notifCount > 0 && (
                        <span className="text-[8px] bg-rose-500/20 text-rose-400 border border-rose-800 px-1.5 py-0.5 rounded-full font-black">
                          {notifCount}
                        </span>
                      )}
                    </Link>
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] text-rose-500 hover:bg-rose-500/10 font-bold uppercase tracking-widest transition-colors border-t border-zinc-800 mt-1"
                    >
                      <LogOut size={13} /> Cerrar Sesión
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#030303]
          [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
          {children}
        </div>
      </main>
    </div>
  );
}