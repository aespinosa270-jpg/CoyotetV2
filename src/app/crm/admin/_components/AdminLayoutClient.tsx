"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, Target, Ticket,
  MessageSquare, Clock, BarChart, Settings,
  Search, Bell, Menu, X, ChevronDown, LogOut,
  User, Package, Warehouse, Truck, AlertTriangle, ShieldCheck, ShoppingBag,
  Bot // <-- Ícono de Bot agregado aquí
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EmployeeRole } from "@prisma/client";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Employee = {
  id:    string;
  name:  string;
  email: string;
  role:  EmployeeRole;
};

// ─── Menú Admin ───────────────────────────────────────────────────────────────
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
  
  // ─── NUEVA RUTA DEL BOT ───
  { name: "Bot IA",            icon: Bot,             href: "/crm/admin/bot" },
  
  { 
    name: "Clientes",          
    icon: Users,           
    href: "/crm/admin/clientes",
    submenus: [
      { name: "Directorio",      href: "/crm/admin/clientes" },
      { name: "Alta de Cliente", href: "/crm/admin/clientes/nuevo" },
    ]
  },
  { name: "Catálogo",          icon: Package,         href: "/crm/admin/productos"     },
  { name: "Pedidos",           icon: ShoppingBag,     href: "/crm/admin/pedidos"       },
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
  {
    name: "Vigilancia QA",     icon: ShieldCheck,     href: "/crm/admin/calidad",
    submenus: [
      { name: "Monitor Calidad IA", href: "/crm/admin/calidad" },
      { name: "Logs del Sistema",   href: "/crm/admin/auditoria" },
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
    ticket:   "text-rose-500",
    cliente:  "text-yellow-600",
    deal:     "text-emerald-500",
    producto: "text-sky-500",
  };

  return (
    <div ref={ref} className="relative hidden md:block">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => query.length >= 2 && setOpen(true)}
        placeholder="Buscar lead, ticket, cliente..."
        className="bg-gray-100 border border-gray-200 text-black text-xs font-mono px-9 py-2 rounded-xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all w-72 placeholder:text-gray-400 shadow-inner"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 font-bold border border-gray-200 px-1.5 py-0.5 rounded pointer-events-none bg-white">
        ⌘K
      </span>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50"
          >
            {loading && (
              <div className="px-4 py-3 text-[10px] text-gray-500 uppercase tracking-widest">
                Buscando...
              </div>
            )}
            {!loading && results.length === 0 && (
              <div className="px-4 py-3 text-[10px] text-gray-500 uppercase tracking-widest">
                Sin resultados para "{query}"
              </div>
            )}
            {!loading && results.map((r) => (
              <button key={r.id} onClick={() => handleSelect(r.href)}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
              >
                <span className={`text-[8px] font-black uppercase tracking-widest pt-0.5 w-14 shrink-0 ${TYPE_COLORS[r.type]}`}>
                  {r.type}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-black truncate">{r.label}</p>
                  <p className="text-[10px] text-gray-500 truncate">{r.sub}</p>
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

// ─── Layout principal Admin ───────────────────────────────────────────────────
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

  const initials = employee
    ? employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    // 🏢 FONDO CLARO CORPORATIVO Y TEXTO NEGRO
    <div className="flex h-screen bg-[#F8F9FA] text-black overflow-hidden selection:bg-[#FDCB02] selection:text-black font-sans">

      {/* Overlay móvil */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── SIDEBAR (Blanco con acentos limpios) ───────────────────────────────── */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-gray-200
        flex flex-col shadow-2xl md:shadow-none
        transition-transform duration-300 ease-in-out
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100 shrink-0">
          <h1 className="text-lg font-[1000] uppercase tracking-tighter text-black">
            COYOTE <span className="text-[#FDCB02]">ADMIN</span>
          </h1>
          <button className="md:hidden text-gray-400 hover:text-black transition-colors"
            onClick={() => setIsMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 [&::-webkit-scrollbar]:w-0">
          <p className="text-[8px] font-black uppercase tracking-[0.25em] text-gray-400 mb-3 px-2">
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
                        ? "bg-[#FDCB02] text-black shadow-sm"
                        : isItemActive && hasSubmenu
                        ? "text-black bg-gray-100"
                        : "text-gray-500 hover:text-black hover:bg-gray-50"}
                    `}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon size={14} className={isItemActive && !hasSubmenu ? "text-black" : ""} />
                      {item.name}
                    </div>
                    {hasSubmenu && (
                      <ChevronDown size={12} className={`transition-transform duration-200 ${
                        isSubmenuOpen ? "rotate-180 text-black" : "text-gray-400"
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
                        <div className="ml-8 mt-1 flex flex-col gap-1 border-l-2 border-gray-100 pl-3 py-1">
                          {item.submenus!.map((sub) => {
                            const isSubActive = pathname === sub.href;
                            return (
                              <Link key={sub.href} href={sub.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={`px-3 py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-colors ${
                                  isSubActive
                                    ? "text-black bg-[#FDCB02]/20"
                                    : "text-gray-500 hover:text-black hover:bg-gray-100"
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
        <div className="p-3 border-t border-gray-100 shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-gray-200 shadow-sm">
            <div className="w-7 h-7 rounded-lg bg-black text-[#FDCB02] text-[9px] font-black flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-black truncate">{employee?.name ?? "Admin"}</p>
              <p className="text-[8px] text-gray-500 uppercase tracking-widest truncate font-bold">
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
        <header className="h-16 border-b border-gray-200 bg-white/90 backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-40 sticky top-0 shrink-0">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-gray-500 hover:text-black transition-colors"
              onClick={() => setIsMobileOpen(true)}>
              <Menu size={22} />
            </button>
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-4">
            {/* Bell con badge real */}
            <Link href="/crm/admin/tickets/abiertos" className="relative text-gray-400 hover:text-black transition-colors">
              <Bell size={17} />
              {notifCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[7px] font-black text-white shadow-sm">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </Link>

            <div className="w-px h-5 bg-gray-200 hidden md:block" />

            {/* Avatar + dropdown */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setIsProfileOpen((p) => !p)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="text-right hidden md:block">
                  <p className="text-[10px] font-bold text-black uppercase tracking-wider leading-none">
                    {employee?.name?.split(" ")[0] ?? "Admin"}
                  </p>
                  <p className="text-[9px] text-gray-500 font-bold mt-0.5">
                    {employee ? ROLE_LABEL[employee.role] : "—"}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-black text-[#FDCB02] flex items-center justify-center font-black text-xs uppercase shadow-sm">
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
                    className="absolute right-0 mt-3 w-52 bg-white border border-gray-200 rounded-2xl shadow-xl py-2 overflow-hidden z-50"
                  >
                    {/* Info empleado */}
                    <div className="px-4 py-3 border-b border-gray-100 mb-1">
                      <p className="text-xs font-bold text-black">{employee?.name}</p>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">{employee?.email}</p>
                    </div>

                    <Link href="/crm/admin/configuracion"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-[10px] text-gray-600 hover:text-black hover:bg-gray-50 font-bold uppercase tracking-widest transition-colors"
                    >
                      <User size={13} className="text-gray-400" /> Mi Perfil
                    </Link>
                    <Link href="/crm/admin/tickets/abiertos"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center justify-between px-4 py-2.5 text-[10px] text-gray-600 hover:text-black hover:bg-gray-50 font-bold uppercase tracking-widest transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <AlertTriangle size={13} className="text-rose-500" /> Tickets Urgentes
                      </span>
                      {notifCount > 0 && (
                        <span className="text-[8px] bg-rose-100 text-rose-600 border border-rose-200 px-1.5 py-0.5 rounded-full font-black">
                          {notifCount}
                        </span>
                      )}
                    </Link>
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] text-red-600 hover:bg-red-50 font-bold uppercase tracking-widest transition-colors border-t border-gray-100 mt-1"
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
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F8F9FA]
          [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
          {children}
        </div>
      </main>
    </div>
  );
}