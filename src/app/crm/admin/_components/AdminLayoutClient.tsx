"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, Target, Ticket,
  MessageSquare, Clock, BarChart, Settings,
  Search, Bell, Menu, X, ChevronDown, LogOut,
  User, Package, Warehouse, Truck, AlertTriangle, ShieldCheck, ShoppingBag,
  Bot, Sun,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EmployeeRole } from "@prisma/client";
import { puedeVer } from "@/lib/permisos";

type Employee = { id: string; name: string; email: string; role: EmployeeRole; };
type MenuItem = { name: string; icon: any; href: string; submenus?: { name: string; href: string }[] };
type MenuGroup = { group: string; items: MenuItem[] };

// Subrutas del bot (la antigua segunda barra) -> submenu de "El Coyote"
const BOT_SUBMENUS = [
  { divider: "Inicio" },
  { name: "Hoy", href: "/crm/admin/bot/hoy" },
  { name: "Dashboard", href: "/crm/admin/bot" },
  { divider: "Vender" },
  { name: "Conversaciones", href: "/crm/admin/bot/conversaciones" },
  { name: "Clientes", href: "/crm/admin/bot/clientes" },
  { name: "Seguimientos", href: "/crm/admin/bot/seguimientos" },
  { name: "Sales Agent", href: "/crm/admin/bot/sales-agent" },
  { name: "Referidos", href: "/crm/admin/bot/referidos" },
  { divider: "Operar" },
  { name: "Ordenes del Bot", href: "/crm/admin/bot/ordenes" },
  { name: "Escalaciones", href: "/crm/admin/bot/escalaciones" },
  { name: "Transportistas", href: "/crm/admin/bot/transportistas" },
  { name: "Sourcing >1tn", href: "/crm/admin/bot/sourcing-queue" },
  { name: "Aftercare", href: "/crm/admin/bot/aftercare" },
  { divider: "Cobrar" },
  { name: "Pagos pendientes", href: "/crm/admin/bot/pendientes" },
  { divider: "Entender" },
  { name: "Metricas", href: "/crm/admin/bot/metricas" },
  { name: "Objeciones", href: "/crm/admin/bot/objeciones" },
  { name: "Catalogo del bot", href: "/crm/admin/bot/catalogo" },
  { name: "Telas solicitadas", href: "/crm/admin/bot/telas-solicitadas" },
  { name: "Voz de Marca", href: "/crm/admin/bot/voz-de-marca" },
  { divider: "Config" },
  { name: "Contactos", href: "/crm/admin/bot/contactos" },
  { name: "Programaciones", href: "/crm/admin/bot/programaciones" },
  { name: "Configuracion bot", href: "/crm/admin/bot/config" },
  { name: "Estado tecnico", href: "/crm/admin/bot/health" },
];

// CRM general (Leads, Inventario, etc.) - casi no se usa, colapsado al fondo
const CRM_GENERAL_SUBMENUS = [
  { name: "Leads / Ventas", href: "/crm/admin/leads" },
  { name: "Clientes (directorio)", href: "/crm/admin/clientes" },
  { name: "Interacciones", href: "/crm/admin/interacciones" },
  { name: "Pedidos web", href: "/crm/admin/pedidos" },
  { name: "Catalogo web", href: "/crm/admin/productos" },
  { name: "Inventario", href: "/crm/admin/inventario" },
  { name: "Flotilla / Rutas", href: "/crm/admin/flotilla" },
  { name: "Tickets / Soporte", href: "/crm/admin/tickets" },
  { name: "Dashboard general", href: "/crm/admin" },
  { name: "Reportes", href: "/crm/admin/reportes" },
  { name: "Agentes", href: "/crm/admin/agentes" },
  { name: "Horarios", href: "/crm/admin/horarios" },
  { name: "Vigilancia QA", href: "/crm/admin/calidad" },
];

// "El Coyote primero": secciones del bot planas por zona, un clic cada una.
const menuGroups: MenuGroup[] = [
  {
    group: "Inicio",
    items: [
      { name: "Hoy", icon: Sun, href: "/crm/admin/bot/hoy" },
      { name: "Dashboard", icon: LayoutDashboard, href: "/crm/admin/bot" },
    ],
  },
  {
    group: "Vender",
    items: [
      { name: "Conversaciones", icon: MessageSquare, href: "/crm/admin/bot/conversaciones" },
      { name: "Clientes", icon: Users, href: "/crm/admin/bot/clientes" },
      { name: "Seguimientos", icon: Target, href: "/crm/admin/bot/seguimientos" },
      { name: "Sales Agent", icon: Bot, href: "/crm/admin/bot/sales-agent" },
      { name: "Referidos", icon: ShoppingBag, href: "/crm/admin/bot/referidos" },
    ],
  },
  {
    group: "Operar",
    items: [
      { name: "Ordenes del Bot", icon: ShoppingBag, href: "/crm/admin/bot/ordenes" },
      { name: "Pedidos", icon: Package, href: "/crm/admin/pedidos" },
      { name: "Escalaciones", icon: AlertTriangle, href: "/crm/admin/bot/escalaciones" },
      { name: "Transportistas", icon: Truck, href: "/crm/admin/bot/transportistas" },
      { name: "Sourcing >1tn", icon: Warehouse, href: "/crm/admin/bot/sourcing-queue" },
      { name: "Aftercare", icon: ShieldCheck, href: "/crm/admin/bot/aftercare" },
    ],
  },
  {
    group: "Cobrar",
    items: [
      { name: "Pagos pendientes", icon: Package, href: "/crm/admin/bot/pendientes" },
    ],
  },
  {
    group: "Entender",
    items: [
      { name: "Metricas", icon: BarChart, href: "/crm/admin/bot/metricas" },
      { name: "Objeciones", icon: AlertTriangle, href: "/crm/admin/bot/objeciones" },
      { name: "Catalogo del bot", icon: Package, href: "/crm/admin/bot/catalogo" },
      { name: "Telas solicitadas", icon: Warehouse, href: "/crm/admin/bot/telas-solicitadas" },
      { name: "Voz de Marca", icon: MessageSquare, href: "/crm/admin/bot/voz-de-marca" },
    ],
  },
  {
    group: "Config",
    items: [
      { name: "Contactos", icon: Users, href: "/crm/admin/bot/contactos" },
      { name: "Programaciones", icon: Clock, href: "/crm/admin/bot/programaciones" },
      { name: "Configuracion bot", icon: Settings, href: "/crm/admin/bot/config" },
      { name: "Estado tecnico", icon: ShieldCheck, href: "/crm/admin/bot/health" },
    ],
  },
  {
    group: "CRM General",
    items: [
      { name: "CRM General (web)", icon: LayoutDashboard, href: "/crm/admin", submenus: CRM_GENERAL_SUBMENUS },
    ],
  },
];

type SearchResult = { id: string; label: string; sub: string; href: string; type: "ticket" | "cliente" | "deal" | "producto"; };

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); (ref.current?.querySelector("input") as HTMLInputElement)?.focus(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true); setOpen(true);
    try { const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`); setResults((await res.json()) ?? []); }
    catch { setResults([]); } finally { setLoading(false); }
  };
  const handleSelect = (href: string) => { setOpen(false); setQuery(""); setResults([]); router.push(href); };
  const TYPE_COLORS: Record<string, string> = { ticket: "text-rose-400", cliente: "text-amber-400", deal: "text-emerald-400", producto: "text-sky-400" };
  return (
    <div ref={ref} className="relative hidden md:block">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
      <input type="text" value={query} onChange={(e) => handleSearch(e.target.value)} onFocus={() => query.length >= 2 && setOpen(true)}
        placeholder="Buscar lead, ticket, cliente..."
        className="bg-[#15181d] border border-[#2c323b] text-zinc-100 text-xs font-mono px-9 py-2.5 rounded-xl focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-all w-72 placeholder:text-zinc-500" />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-bold border border-[#2c323b] px-1.5 py-0.5 rounded pointer-events-none">⌘K</span>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 w-full bg-[#15181d] border border-[#2c323b] rounded-xl shadow-xl overflow-hidden z-50">
            {loading && <div className="px-4 py-3 text-[10px] text-zinc-500 uppercase tracking-widest">Buscando...</div>}
            {!loading && results.length === 0 && <div className="px-4 py-3 text-[10px] text-zinc-500 uppercase tracking-widest">Sin resultados para "{query}"</div>}
            {!loading && results.map((r) => (
              <button key={r.id} onClick={() => handleSelect(r.href)} className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[#1c2026] transition-colors text-left border-b border-[#22272f] last:border-0">
                <span className={`text-[8px] font-black uppercase tracking-widest pt-0.5 w-14 shrink-0 ${TYPE_COLORS[r.type]}`}>{r.type}</span>
                <div className="min-w-0"><p className="text-xs font-bold text-zinc-100 truncate">{r.label}</p><p className="text-[10px] text-zinc-500 truncate">{r.sub}</p></div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ROLE_LABEL: Record<EmployeeRole, string> = {
  ADMIN: "Administrador", SUPERVISOR: "Supervisor", VENDEDORA: "Vendedora", LOGISTICA: "Logistica", CONTABILIDAD: "Contabilidad",
};

export default function AdminLayoutClient({ children, employee, notifCount }: { children: React.ReactNode; employee: Employee; notifCount: number; }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => signOut({ callbackUrl: "/login" });
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsProfileOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const toggleSubmenu = (name: string) => setOpenSubmenu((prev) => (prev === name ? null : name));
  const initials = employee ? employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "??";

  return (
    <div className="flex h-screen bg-[#0a0b0d] text-zinc-100 overflow-hidden selection:bg-amber-400 selection:text-black font-sans">
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setIsMobileOpen(false)} />
        )}
      </AnimatePresence>

      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-[#101216] to-[#0a0b0d] border-r border-[#2c323b]
        flex flex-col shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#2c323b] shrink-0">
          <h1 className="text-lg font-[1000] uppercase tracking-tighter flex items-center gap-2"><span className="text-xl">🐺</span> COYOTE <span className="text-amber-400">CRM</span></h1>
          <button className="md:hidden text-zinc-500 hover:text-zinc-100 transition-colors" onClick={() => setIsMobileOpen(false)}><X size={18} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#2c323b] [&::-webkit-scrollbar-thumb]:rounded-full">
          {menuGroups
            .map((grp) => ({
              ...grp,
              items: grp.items.filter((it) => puedeVer(employee?.role, it.href)),
            }))
            .filter((grp) => grp.items.length > 0)
            .map((grp) => (
            <div key={grp.group} className="mb-3">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-600 mb-1.5 px-2 mt-2">{grp.group}</p>
              <div className="flex flex-col gap-0.5">
                {grp.items.map((item) => {
                  const hasSubmenu = !!item.submenus?.length;
                  const isItemActive = item.href === "/crm/admin" ? pathname === "/crm/admin" : (item.name === "El Coyote" ? pathname.startsWith("/crm/admin/bot") : pathname === item.href || pathname.startsWith(item.href + "/"));
                  const isSubmenuOpen = openSubmenu === item.name || (isItemActive && hasSubmenu);
                  return (
                    <div key={item.name}>
                      <button onClick={() => hasSubmenu ? toggleSubmenu(item.name) : (router.push(item.href), setIsMobileOpen(false))}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-[12px] tracking-wide transition-all
                          ${isItemActive && !hasSubmenu ? "bg-gradient-to-r from-amber-400/15 to-transparent text-amber-300 border border-amber-400/25"
                            : isItemActive && hasSubmenu ? "text-zinc-100 bg-[#1c2026]"
                            : "text-zinc-400 hover:text-zinc-100 hover:bg-[#15181d] border border-transparent"}`}>
                        <div className="flex items-center gap-3"><item.icon size={15} className={isItemActive ? "text-amber-400" : ""} />{item.name}</div>
                        {hasSubmenu && <ChevronDown size={12} className={`transition-transform duration-200 ${isSubmenuOpen ? "rotate-180 text-amber-400" : "text-zinc-500"}`} />}
                      </button>
                      <AnimatePresence initial={false}>
                        {hasSubmenu && isSubmenuOpen && (
                          <motion.div key="sub" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                            <div className="ml-7 mt-1 flex flex-col gap-0.5 border-l border-[#2c323b] pl-3 py-1 max-h-[280px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#2c323b]">
                              {item.submenus!.map((sub: any) => {
                                  if (sub.divider) {
                                    return (
                                      <p key={"div-" + sub.divider} className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600 px-3 pt-2.5 pb-1">
                                        {sub.divider}
                                      </p>
                                    );
                                  }
                                const isSubActive = pathname === sub.href || (sub.href !== "/crm/admin/bot" && pathname.startsWith(sub.href + "/")) || (sub.href === "/crm/admin/bot" && pathname === "/crm/admin/bot");
                                return (
                                  <Link key={sub.href} href={sub.href} onClick={() => setIsMobileOpen(false)}
                                    className={`px-3 py-2 text-[11px] font-medium rounded-lg transition-colors ${isSubActive ? "text-amber-300 bg-amber-400/10" : "text-zinc-500 hover:text-zinc-100 hover:bg-[#1c2026]"}`}>
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
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-[#2c323b] shrink-0">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#15181d] border border-[#2c323b]">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2b3038] to-[#171a1f] text-amber-400 text-[10px] font-black flex items-center justify-center shrink-0 border border-[#2c323b]">{initials}</div>
            <div className="flex-1 min-w-0"><p className="text-[12px] font-bold text-zinc-100 truncate">{employee?.name ?? "Admin"}</p><p className="text-[9px] text-zinc-500 uppercase tracking-widest truncate font-bold">{employee ? ROLE_LABEL[employee.role] : "—"}</p></div>
            <span className="relative flex h-2 w-2 shrink-0"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-[#2c323b] bg-[#0d0d0f]/90 backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-40 sticky top-0 shrink-0">
          <div className="flex items-center gap-4"><button className="md:hidden text-zinc-400 hover:text-zinc-100 transition-colors" onClick={() => setIsMobileOpen(true)}><Menu size={22} /></button><GlobalSearch /></div>
          <div className="flex items-center gap-4">
            <Link href="/crm/admin/tickets/abiertos" className="relative text-zinc-400 hover:text-amber-400 transition-colors"><Bell size={17} />{notifCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 border-2 border-[#0d0d0f] rounded-full flex items-center justify-center text-[7px] font-black text-white">{notifCount > 9 ? "9+" : notifCount}</span>}</Link>
            <div className="w-px h-5 bg-[#2c323b] hidden md:block" />
            <div ref={profileRef} className="relative">
              <button onClick={() => setIsProfileOpen((p) => !p)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="text-right hidden md:block"><p className="text-[11px] font-bold text-zinc-100 uppercase tracking-wider leading-none">{employee?.name?.split(" ")[0] ?? "Admin"}</p><p className="text-[9px] text-zinc-500 font-bold mt-0.5">{employee ? ROLE_LABEL[employee.role] : "—"}</p></div>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-black flex items-center justify-center font-black text-xs uppercase shadow-sm">{initials}</div>
              </button>
              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div key="profile-dd" initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }} transition={{ duration: 0.12 }} className="absolute right-0 mt-3 w-52 bg-[#15181d] border border-[#2c323b] rounded-2xl shadow-xl py-2 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-[#22272f] mb-1"><p className="text-xs font-bold text-zinc-100">{employee?.name}</p><p className="text-[10px] text-zinc-500 truncate mt-0.5">{employee?.email}</p></div>
                    <Link href="/crm/admin/configuracion" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-[11px] text-zinc-400 hover:text-zinc-100 hover:bg-[#1c2026] font-bold uppercase tracking-widest transition-colors"><User size={13} className="text-zinc-500" /> Mi Perfil</Link>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] text-rose-400 hover:bg-rose-500/10 font-bold uppercase tracking-widest transition-colors border-t border-[#22272f] mt-1"><LogOut size={13} /> Cerrar Sesion</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F8F9FA] text-black [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-thumb]:rounded-full">
          {children}
        </div>
      </main>
    </div>
  );
}
