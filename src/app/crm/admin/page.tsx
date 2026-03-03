// Server Component — carga datos reales directo de la DB
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Users, Ticket, Package, Warehouse,
  AlertTriangle, ArrowUpRight, Activity, ArrowRight, Truck,
} from "lucide-react";
import LogoutButton from "./_components/LogoutButton"; // ← componente client pequeño

// ─────────────────────────────────────────────────────────────────────────────
// DATA — todo en parallel para no bloquear
// ─────────────────────────────────────────────────────────────────────────────
async function getDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalClientes,
    ticketsAbiertos,
    ticketsCriticos,
    totalProductos,
    stockTotal,
    rutasHoy,
    movimientosRecientes,
    ticketsUrgentes,
  ] = await Promise.all([
    // Clientes registrados
    prisma.user.count(),

    // Tickets abiertos
    prisma.ticket.count({ where: { status: { in: ["ABIERTO", "EN_REVISION"] } } }),

    // Tickets críticos (ALTA o URGENTE sin resolver)
    prisma.ticket.count({
      where: {
        status: { in: ["ABIERTO", "EN_REVISION"] },
        priority: { in: ["ALTA", "URGENTE"] },
      },
    }),

    // Productos activos en catálogo
    prisma.product.count({ where: { isActive: true } }),

    // Suma total de inventario (kg/m en todo el sistema)
    prisma.inventory.aggregate({ _sum: { quantity: true } }),

    // Rutas de hoy
    prisma.routeOrder.count({
      where: {
        scheduledAt: { gte: today },
        status: { not: "CANCELADA" },
      },
    }),

    // Últimos 5 movimientos de inventario
    prisma.inventoryMovement.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { title: true } },
        color:   { select: { name: true, hex: true } },
      },
    }),

    // Tickets urgentes sin asignar
    prisma.ticket.findMany({
      where: { priority: "URGENTE", status: "ABIERTO", employeeId: null },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, ticketNumber: true, subject: true, createdAt: true },
    }),
  ]);

  return {
    totalClientes,
    ticketsAbiertos,
    ticketsCriticos,
    totalProductos,
    stockTotal: stockTotal._sum.quantity ?? 0,
    rutasHoy,
    movimientosRecientes,
    ticketsUrgentes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default async function AdminDashboardPage() {
  const d = await getDashboardData();

  const kpis = [
    {
      title: "Clientes Registrados",
      value: d.totalClientes.toLocaleString("es-MX"),
      sub: "Total en sistema",
      icon: Users,
      color: "text-[#FDCB02]",
      href: "/crm/admin/clientes",
    },
    {
      title: "Tickets Abiertos",
      value: d.ticketsAbiertos.toString(),
      sub: `${d.ticketsCriticos} críticos`,
      icon: Ticket,
      color: d.ticketsCriticos > 0 ? "text-rose-500" : "text-emerald-500",
      href: "/crm/admin/tickets",
    },
    {
      title: "Productos Activos",
      value: d.totalProductos.toString(),
      sub: "En catálogo",
      icon: Package,
      color: "text-sky-500",
      href: "/crm/admin/productos",
    },
    {
      title: "Stock Total Sistema",
      value: d.stockTotal.toFixed(1),
      sub: "kg / metros disponibles",
      icon: Warehouse,
      color: "text-violet-400",
      href: "/crm/admin/inventario",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-[1000] uppercase text-white tracking-tighter leading-none">
            Tablero <span className="text-[#FDCB02]">Central</span>
          </h2>
          <p className="text-neutral-500 font-mono text-xs mt-2 uppercase tracking-widest">
            Visión global de Coyote Textil
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#111] border border-white/10 px-4 py-2 rounded-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white">Sistema Activo</span>
          </div>
          {/* LogoutButton es Client Component — el signOut necesita el cliente */}
          <LogoutButton />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Link
            key={kpi.title}
            href={kpi.href}
            className="bg-[#0a0a0a] border border-white/5 p-6 rounded-xl relative overflow-hidden group hover:border-white/15 transition-all flex flex-col justify-between h-36"
          >
            <div className="flex justify-between items-start z-10 relative">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                {kpi.title}
              </span>
              <kpi.icon size={18} className={kpi.color} />
            </div>
            <div className="z-10 relative">
              <p className="text-4xl font-[900] text-white tracking-tighter">{kpi.value}</p>
              <p className="text-[10px] text-neutral-600 mt-1 uppercase tracking-widest">{kpi.sub}</p>
            </div>
            <ArrowUpRight
              size={14}
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400"
            />
            <div
              className={`absolute -bottom-10 -right-10 w-32 h-32 blur-[40px] rounded-full opacity-10 group-hover:opacity-20 transition-opacity ${kpi.color}`}
            />
          </Link>
        ))}
      </div>

      {/* GRID INFERIOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Tickets urgentes sin asignar */}
        <div className="bg-[#0a0a0a] border border-rose-500/20 rounded-xl flex flex-col">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-[900] uppercase tracking-widest text-white flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-500" /> Urgentes Sin Asignar
            </h3>
            {d.ticketsUrgentes.length > 0 && (
              <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded">
                {d.ticketsUrgentes.length}
              </span>
            )}
          </div>
          <div className="p-4 flex-1 space-y-3 min-h-[200px]">
            {d.ticketsUrgentes.length === 0 ? (
              <p className="text-xs text-neutral-600 text-center pt-8 uppercase tracking-widest">
                Sin tickets urgentes 🎉
              </p>
            ) : (
              d.ticketsUrgentes.map((t) => (
                <Link
                  key={t.id}
                  href={`/crm/admin/tickets/${t.id}`}
                  className="bg-[#111] border border-rose-500/10 hover:border-rose-500/30 p-3 rounded-lg flex gap-3 items-start transition-colors block"
                >
                  <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0 animate-pulse" />
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-300 font-medium truncate">{t.subject}</p>
                    <p className="text-[10px] text-neutral-600 font-mono mt-1">{t.ticketNumber}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
          <div className="p-4 border-t border-white/5">
            <Link
              href="/crm/admin/tickets"
              className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors flex items-center gap-1"
            >
              Ver todos los tickets <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Panel derecho: accesos rápidos + actividad */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Accesos rápidos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "Registrar Movimiento", href: "/crm/admin/inventario/movimiento", icon: Warehouse, accent: "#FDCB02" },
              { label: "Catálogo de Telas",    href: "/crm/admin/productos",              icon: Package,   accent: "#38bdf8" },
              { label: "Rutas del Día",        href: "/crm/admin/flotilla/rutas",         icon: Truck,     accent: "#a78bfa" },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="bg-[#0a0a0a] border border-white/5 hover:border-white/15 p-4 rounded-xl flex flex-col gap-3 group transition-all"
              >
                <a.icon size={20} style={{ color: a.accent }} />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 group-hover:text-white transition-colors leading-snug">
                  {a.label}
                </span>
                <ArrowRight size={12} className="text-neutral-700 group-hover:text-neutral-400 transition-colors" />
              </Link>
            ))}
          </div>

          {/* Últimos movimientos de inventario */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-xl flex flex-col flex-1">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-[900] uppercase tracking-widest text-white flex items-center gap-2">
                <Activity size={16} className="text-[#FDCB02]" /> Últimos Movimientos
              </h3>
              <Link
                href="/crm/admin/inventario/historial"
                className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-[#FDCB02] transition-colors flex items-center gap-1"
              >
                Ver historial <ArrowRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-white/5">
              {d.movimientosRecientes.length === 0 ? (
                <p className="text-xs text-neutral-600 text-center py-8 uppercase tracking-widest">
                  Sin movimientos aún
                </p>
              ) : (
                d.movimientosRecientes.map((m) => (
                  <div key={m.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded border shrink-0 ${
                          m.type === "ENTRADA"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-800"
                            : m.type === "SALIDA"
                            ? "bg-rose-500/10 text-rose-400 border-rose-800"
                            : "bg-amber-500/10 text-amber-400 border-amber-800"
                        }`}
                      >
                        {m.type}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-white font-medium truncate">{m.product.title}</p>
                        {m.color && (
                          <span className="flex items-center gap-1 mt-0.5">
                            <span
                              className="w-2 h-2 rounded-full border border-white/20 inline-block shrink-0"
                              style={{ backgroundColor: m.color.hex }}
                            />
                            <span className="text-[10px] text-neutral-500">{m.color.name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm font-bold text-[#FDCB02]">{m.quantity.toFixed(1)}</p>
                      <p className="text-[10px] text-neutral-600 font-mono">
                        {new Date(m.createdAt).toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}