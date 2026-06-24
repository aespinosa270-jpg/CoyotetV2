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

// Color por zona (Coyote Vivo) - cada grupo tiene su acento
const ZONE_COLOR: Record<string, string> = {
  "Inicio": "#7c5cff",
  "Vender": "#36d6a0",
  "Operar": "#3db8ff",
  "Cobrar": "#ffb340",
  "Entender": "#ff6ba6",
  "Config": "#9d7bff",
  "CRM General": "#8b85a6",
};

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

const menuGroups: MenuGroup[] = [
  { group: "Inicio", items: [
    { name: "Hoy", icon: Sun, href: "/crm/admin/bot/hoy" },
    { name: "Dashboard", icon: LayoutDashboard, href: "/crm/admin/bot" },
  ]},
  { group: "Vender", items: [
    { name: "Conversaciones", icon: MessageSquare, href: "/crm/admin/bot/conversaciones" },
    { name: "Clientes", icon: Users, href: "/crm/admin/bot/clientes" },
    { name: "Seguimientos", icon: Target, href: "/crm/admin/bot/seguimientos" },
    { name: "Sales Agent", icon: Bot, href: "/crm/admin/bot/sales-agent" },
    { name: "Referidos", icon: ShoppingBag, href: "/crm/admin/bot/referidos" },
    { name: "Checador", icon: Clock, href: "/crm/admin/checador" },
  ]},
  { group: "Operar", items: [
    { name: "Ordenes del Bot", icon: ShoppingBag, href: "/crm/admin/bot/ordenes" },
    { name: "Pedidos", icon: Package, href: "/crm/admin/pedidos" },
    { name: "Escalaciones", icon: AlertTriangle, href: "/crm/admin/bot/escalaciones" },
    { name: "Transportistas", icon: Truck, href: "/crm/admin/bot/transportistas" },
    { name: "Sourcing >1tn", icon: Warehouse, href: "/crm/admin/bot/sourcing-queue" },
    { name: "Aftercare", icon: ShieldCheck, href: "/crm/admin/bot/aftercare" },
  ]},
  { group: "Cobrar", items: [
    { name: "Pagos pendientes", icon: Package, href: "/crm/admin/bot/pendientes" },
  ]},
  { group: "Entender", items: [
    { name: "Metricas", icon: BarChart, href: "/crm/admin/bot/metricas" },
    { name: "Objeciones", icon: AlertTriangle, href: "/crm/admin/bot/objeciones" },
    { name: "Catalogo del bot", icon: Package, href: "/crm/admin/bot/catalogo" },
    { name: "Telas solicitadas", icon: Warehouse, href: "/crm/admin/bot/telas-solicitadas" },
    { name: "Voz de Marca", icon: MessageSquare, href: "/crm/admin/bot/voz-de-marca" },
  ]},
  { group: "Config", items: [
    { name: "Contactos", icon: Users, href: "/crm/admin/bot/contactos" },
    { name: "Programaciones", icon: Clock, href: "/crm/admin/bot/programaciones" },
    { name: "Configuracion bot", icon: Settings, href: "/crm/admin/bot/config" },
    { name: "Estado tecnico", icon: ShieldCheck, href: "/crm/admin/bot/health" },
  ]},
  { group: "CRM General", items: [
    { name: "CRM General (web)", icon: LayoutDashboard, href: "/crm/admin", submenus: CRM_GENERAL_SUBMENUS },
  ]},
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
  const TYPE_COLORS: Record<string, string> = { ticket: "#ff6b6b", cliente: "#ffb340", deal: "#36d6a0", producto: "#3db8ff" };
  return (
    <div ref={ref} className="relative hidden md:block">
      <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#8b85a6" }} />
      <input type="text" value={query} onChange={(e) => handleSearch(e.target.value)} onFocus={() => query.length >= 2 && setOpen(true)}
        placeholder="Buscar lead, ticket, cliente..."
        className="text-sm font-semibold pl-11 pr-14 py-2.5 rounded-2xl focus:outline-none transition-all w-80"
        style={{ background: "#f5f3fb", border: "1.5px solid #ece8fa", color: "#2b2546" }} />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-1 rounded-lg pointer-events-none" style={{ color: "#8b85a6", background: "#ece8fa" }}>⌘K</span>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 w-full rounded-2xl overflow-hidden z-50"
            style={{ background: "#fff", border: "1.5px solid #ece8fa", boxShadow: "0 16px 40px -16px rgba(124,92,255,0.3)" }}>
            {loading && <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "#8b85a6" }}>Buscando...</div>}
            {!loading && results.length === 0 && <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "#8b85a6" }}>Sin resultados para "{query}"</div>}
            {!loading && results.map((r) => (
              <button key={r.id} onClick={() => handleSelect(r.href)} className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-violet-50" style={{ borderBottom: "1px solid #f4f2fb" }}>
                <span className="text-[9px] font-black uppercase tracking-widest pt-0.5 w-14 shrink-0" style={{ color: TYPE_COLORS[r.type] }}>{r.type}</span>
                <div className="min-w-0"><p className="text-sm font-bold truncate" style={{ color: "#2b2546" }}>{r.label}</p><p className="text-[11px] truncate" style={{ color: "#8b85a6" }}>{r.sub}</p></div>
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
    <div className="coyote-vivo flex h-screen overflow-hidden" style={{ background: "#f4f2fb", color: "#2b2546" }}>
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden" style={{ background: "rgba(43,37,70,0.4)", backdropFilter: "blur(4px)" }} onClick={() => setIsMobileOpen(false)} />
        )}
      </AnimatePresence>

      {/* ─── SIDEBAR ─── */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-[260px] flex flex-col transition-transform duration-300 ease-in-out
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        style={{ background: "linear-gradient(180deg,#ffffff,#faf8ff)", borderRight: "1px solid #ece8fa" }}>

        {/* Brand */}
        <div className="h-[72px] flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl grid place-items-center text-2xl shrink-0" style={{ background: "linear-gradient(135deg,#7c5cff,#3db8ff)", boxShadow: "0 8px 18px -6px rgba(124,92,255,0.5)" }}>🐺</div>
            <h1 className="cv-display text-xl" style={{ fontWeight: 800 }}>Coyote<span style={{ color: "#7c5cff" }}>CRM</span></h1>
          </div>
          <button className="md:hidden" style={{ color: "#8b85a6" }} onClick={() => setIsMobileOpen(false)}><X size={20} /></button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto cv-scroll py-2 px-3">
          {menuGroups
            .map((grp) => ({ ...grp, items: grp.items.filter((it) => puedeVer(employee?.role, it.href)) }))
            .filter((grp) => grp.items.length > 0)
            .map((grp) => {
              const zoneColor = ZONE_COLOR[grp.group] ?? "#7c5cff";
              return (
              <div key={grp.group} className="mb-2">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] mb-1.5 px-3 mt-3" style={{ color: "#b3acc9" }}>{grp.group}</p>
                <div className="flex flex-col gap-1">
                  {grp.items.map((item) => {
                    const hasSubmenu = !!item.submenus?.length;
                    const isItemActive = item.href === "/crm/admin" ? pathname === "/crm/admin" : (pathname === item.href || pathname.startsWith(item.href + "/"));
                    const isSubmenuOpen = openSubmenu === item.name || (isItemActive && hasSubmenu);
                    const Icon = item.icon;
                    return (
                      <div key={item.name}>
                        <button onClick={() => hasSubmenu ? toggleSubmenu(item.name) : (router.push(item.href), setIsMobileOpen(false))}
                          className="cv-nav-item w-full flex items-center justify-between rounded-2xl font-bold text-[13.5px] transition-all"
                          style={{
                            padding: "9px 12px",
                            background: isItemActive && !hasSubmenu ? "linear-gradient(135deg,#7c5cff,#9d7bff)" : "transparent",
                            color: isItemActive && !hasSubmenu ? "#fff" : "#6b6485",
                            boxShadow: isItemActive && !hasSubmenu ? "0 10px 22px -10px rgba(124,92,255,0.6)" : "none",
                          }}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl grid place-items-center shrink-0 transition-all"
                              style={{ background: isItemActive && !hasSubmenu ? "rgba(255,255,255,0.22)" : `${zoneColor}1a`, color: isItemActive && !hasSubmenu ? "#fff" : zoneColor }}>
                              <Icon size={16} />
                            </div>
                            {item.name}
                          </div>
                          {hasSubmenu && <ChevronDown size={14} className="transition-transform duration-200" style={{ transform: isSubmenuOpen ? "rotate(180deg)" : "none", color: isItemActive ? "#fff" : "#b3acc9" }} />}
                        </button>
                        <AnimatePresence initial={false}>
                          {hasSubmenu && isSubmenuOpen && (
                            <motion.div key="sub" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                              <div className="ml-6 mt-1 flex flex-col gap-0.5 pl-3 py-1 max-h-[280px] overflow-y-auto cv-scroll" style={{ borderLeft: "2px solid #ece8fa" }}>
                                {item.submenus!.map((sub: any) => {
                                  if (sub.divider) {
                                    return <p key={"div-" + sub.divider} className="text-[9px] font-extrabold uppercase tracking-[0.15em] px-3 pt-2.5 pb-1" style={{ color: "#c4bdda" }}>{sub.divider}</p>;
                                  }
                                  const isSubActive = pathname === sub.href || (sub.href !== "/crm/admin/bot" && pathname.startsWith(sub.href + "/")) || (sub.href === "/crm/admin/bot" && pathname === "/crm/admin/bot");
                                  return (
                                    <Link key={sub.href} href={sub.href} onClick={() => setIsMobileOpen(false)}
                                      className="px-3 py-2 text-[12px] font-semibold rounded-xl transition-colors"
                                      style={{ color: isSubActive ? "#7c5cff" : "#8b85a6", background: isSubActive ? "#f0ebff" : "transparent" }}>
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
              );
            })}
        </nav>

        {/* User chip */}
        <div className="p-3 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl" style={{ background: "#f5f1ff", border: "1.5px solid #ece8fa" }}>
            <div className="w-9 h-9 rounded-xl grid place-items-center font-extrabold text-sm text-white shrink-0" style={{ background: "linear-gradient(135deg,#ffb340,#ff6ba6)" }}>{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-extrabold truncate" style={{ color: "#2b2546" }}>{employee?.name ?? "Admin"}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: "#8b85a6" }}>{employee ? ROLE_LABEL[employee.role] : "—"}</p>
            </div>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#36d6a0", boxShadow: "0 0 0 3px rgba(54,214,160,0.2)" }} />
          </div>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-[72px] flex items-center justify-between px-4 md:px-7 z-40 sticky top-0 shrink-0"
          style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #ece8fa" }}>
          <div className="flex items-center gap-4">
            <button className="md:hidden" style={{ color: "#6b6485" }} onClick={() => setIsMobileOpen(true)}><Menu size={24} /></button>
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-4">
            <Link href="/crm/admin/tickets/abiertos" className="relative w-11 h-11 rounded-2xl grid place-items-center transition-all hover:scale-105" style={{ background: "#f5f3fb", color: "#6b6485" }}>
              <Bell size={18} />
              {notifCount > 0 && <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full grid place-items-center text-[10px] font-extrabold text-white" style={{ background: "#ff6ba6", border: "2px solid #fff" }}>{notifCount > 9 ? "9+" : notifCount}</span>}
            </Link>
            <div className="w-px h-6 hidden md:block" style={{ background: "#ece8fa" }} />
            <div ref={profileRef} className="relative">
              <button onClick={() => setIsProfileOpen((p) => !p)} className="flex items-center gap-3 transition-opacity hover:opacity-80">
                <div className="text-right hidden md:block">
                  <p className="text-[13px] font-extrabold leading-none" style={{ color: "#2b2546" }}>{employee?.name?.split(" ")[0] ?? "Admin"}</p>
                  <p className="text-[10px] font-bold mt-0.5" style={{ color: "#8b85a6" }}>{employee ? ROLE_LABEL[employee.role] : "—"}</p>
                </div>
                <div className="w-10 h-10 rounded-2xl grid place-items-center font-extrabold text-sm text-white" style={{ background: "linear-gradient(135deg,#ffb340,#ff6ba6)", boxShadow: "0 8px 18px -8px rgba(255,107,166,0.5)" }}>{initials}</div>
              </button>
              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div key="profile-dd" initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }} transition={{ duration: 0.12 }}
                    className="absolute right-0 mt-3 w-56 rounded-2xl py-2 overflow-hidden z-50" style={{ background: "#fff", border: "1.5px solid #ece8fa", boxShadow: "0 16px 40px -16px rgba(124,92,255,0.3)" }}>
                    <div className="px-4 py-3 mb-1" style={{ borderBottom: "1px solid #f4f2fb" }}>
                      <p className="text-sm font-extrabold" style={{ color: "#2b2546" }}>{employee?.name}</p>
                      <p className="text-[11px] truncate mt-0.5" style={{ color: "#8b85a6" }}>{employee?.email}</p>
                    </div>
                    <Link href="/crm/admin/configuracion" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-[12px] font-bold transition-colors hover:bg-violet-50" style={{ color: "#6b6485" }}><User size={15} style={{ color: "#8b85a6" }} /> Mi Perfil</Link>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] font-bold transition-colors hover:bg-rose-50" style={{ color: "#ff6b6b", borderTop: "1px solid #f4f2fb", marginTop: "4px" }}><LogOut size={15} /> Cerrar Sesion</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Area de contenido */}
        <div className="flex-1 overflow-y-auto cv-scroll p-4 md:p-7" style={{ background: "#f4f2fb" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
