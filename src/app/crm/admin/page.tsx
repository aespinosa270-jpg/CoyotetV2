import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Users, Ticket, Package, Warehouse,
  AlertTriangle, ArrowUpRight, Activity,
  ArrowRight, Truck, DollarSign, TrendingUp, Wallet
} from "lucide-react";

async function getDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalClientes,
    ticketsAbiertos,
    ticketsCriticos,
    totalProductos,
    stockTotal,
    rutasHoy,
    movimientosRecientes,
    ticketsUrgentes,
    // --- NUEVAS QUERIES DE VENTAS Y PIPELINE ---
    pipelineTotal,
    ventasMes,
  ] = await Promise.all([
    prisma.user.count(),

    prisma.ticket.count({
      where: { status: { in: ["ABIERTO", "EN_REVISION"] } },
    }),

    prisma.ticket.count({
      where: {
        status:   { in: ["ABIERTO", "EN_REVISION"] },
        priority: { in: ["ALTA", "URGENTE"] },
      },
    }),

    prisma.product.count({ where: { isActive: true } }),

    prisma.inventory.aggregate({ _sum: { quantity: true } }),

    prisma.routeOrder.count({
      where: {
        scheduledAt: { gte: today },
        status:      { not: "CANCELADA" },
      },
    }),

    prisma.inventoryMovement.findMany({
      take:    5,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { title: true } },
        color:   { select: { name: true, hex: true } },
      },
    }),

    prisma.ticket.findMany({
      where:   { priority: "URGENTE", status: "ABIERTO", employeeId: null },
      take:    5,
      orderBy: { createdAt: "desc" },
      select:  { id: true, ticketNumber: true, subject: true, createdAt: true },
    }),

    // Dinero "en la calle" (Prospectos, Cotizando, Negociación)
    prisma.deal.aggregate({
      where: { status: { in: ["PROSPECTO", "COTIZANDO", "NEGOCIACION"] } },
      _sum: { value: true }
    }),

    // Dinero "en la bolsa" (Ganado este mes)
    prisma.deal.aggregate({
      where: { status: "CERRADO_GANADO", updatedAt: { gte: startOfMonth } },
      _sum: { value: true }
    })
  ]);

  return {
    totalClientes,
    ticketsAbiertos,
    ticketsCriticos,
    totalProductos,
    stockTotal:      stockTotal._sum.quantity ?? 0,
    rutasHoy,
    movimientosRecientes,
    ticketsUrgentes,
    pipelineTotal:   pipelineTotal._sum.value ?? 0,
    ventasMes:       ventasMes._sum.value ?? 0,
  };
}

export default async function AdminDashboardPage() {
  const d = await getDashboardData();

  const kpis = [
    {
      title: "Ventas del Mes",
      value: `$${(d.ventasMes / 1000).toFixed(1)}k`,
      sub:   "Cerrado Ganado",
      icon:  DollarSign,
      color: "text-emerald-500",
      href:  "/crm/admin/leads",
    },
    {
      title: "Pipeline Activo",
      value: `$${(d.pipelineTotal / 1000).toFixed(1)}k`,
      sub:   "En Negociación",
      icon:  TrendingUp,
      color: "text-sky-400",
      href:  "/crm/admin/leads",
    },
    {
      title: "Clientes",
      value: d.totalClientes.toLocaleString("es-MX"),
      sub:   "Cartera Total",
      icon:  Users,
      color: "text-[#FDCB02]",
      href:  "/crm/admin/clientes",
    },
    {
      title: "Tickets",
      value: d.ticketsAbiertos.toString(),
      sub:   `${d.ticketsCriticos} críticos`,
      icon:  Ticket,
      color: d.ticketsCriticos > 0 ? "text-rose-500" : "text-emerald-500",
      href:  "/crm/admin/soporte",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-[1000] uppercase text-white tracking-tighter leading-none">
            Tablero <span className="text-[#FDCB02]">Central</span>
          </h2>
          <p className="text-zinc-600 font-mono text-xs mt-2 uppercase tracking-widest italic">
            Control Operativo Coyote Textil
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white">Online</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Link key={kpi.title} href={kpi.href}
            className="bg-[#0a0a0a] border border-white/[0.05] p-6 rounded-2xl relative overflow-hidden group hover:border-white/10 transition-all flex flex-col justify-between h-36"
          >
            <div className="flex justify-between items-start z-10 relative">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{kpi.title}</span>
              <kpi.icon size={16} className={kpi.color} />
            </div>
            <div className="z-10 relative">
              <p className="text-4xl font-[1000] text-white tracking-tighter italic">{kpi.value}</p>
              <p className="text-[10px] text-zinc-700 mt-1 uppercase tracking-widest font-bold">{kpi.sub}</p>
            </div>
            <ArrowUpRight size={13} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500" />
          </Link>
        ))}
      </div>

      {/* Grid inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Tickets urgentes sin asignar */}
        <div className="bg-[#0a0a0a] border border-rose-500/20 rounded-2xl flex flex-col shadow-2xl">
          <div className="p-5 border-b border-white/[0.04] flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
              <AlertTriangle size={14} className="text-rose-500" /> Urgencias
            </h3>
          </div>
          <div className="p-4 flex-1 space-y-2 min-h-[200px]">
            {d.ticketsUrgentes.length === 0 ? (
              <p className="text-[10px] text-zinc-700 text-center pt-8 uppercase tracking-widest italic">Todo bajo control 🎉</p>
            ) : (
              d.ticketsUrgentes.map((t) => (
                <Link key={t.id} href="/crm/admin/soporte" className="bg-zinc-900/60 border border-rose-500/10 hover:border-rose-500/30 p-3 rounded-xl flex gap-3 items-start transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0 animate-pulse" />
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-300 font-bold truncate">{t.subject}</p>
                    <p className="text-[9px] text-zinc-600 font-mono mt-0.5">#{t.id.slice(0,8)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Accesos rápidos + últimos movimientos */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          {/* Accesos rápidos con Nómina */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "CRM / Pipeline",  href: "/crm/admin/leads",      icon: TrendingUp, color: "#FDCB02" },
              { label: "Corte de Nómina", href: "/crm/admin/nomina",     icon: Wallet,     color: "#10B981" },
              { label: "Inventario",      href: "/crm/admin/inventario", icon: Warehouse,  color: "#38bdf8" },
              { label: "Rutas / Flota",   href: "/crm/admin/flotilla",  icon: Truck,      color: "#a78bfa" },
            ].map((a) => (
              <Link key={a.href} href={a.href} className="bg-[#0a0a0a] border border-white/[0.05] hover:border-white/10 p-4 rounded-2xl flex flex-col gap-3 group transition-all">
                <a.icon size={18} style={{ color: a.color }} />
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 group-hover:text-white transition-colors">{a.label}</span>
              </Link>
            ))}
          </div>

          {/* Últimos movimientos */}
          <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-2xl flex flex-col flex-1 shadow-2xl">
            <div className="p-5 border-b border-white/[0.04] flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                <Activity size={14} className="text-[#FDCB02]" /> Movimientos de Almacén
              </h3>
            </div>
            <div className="divide-y divide-white/[0.03]">
              {d.movimientosRecientes.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded border ${m.type === "ENTRADA" ? "bg-emerald-500/10 text-emerald-400 border-emerald-800" : "bg-rose-500/10 text-rose-400 border-rose-800"}`}>{m.type}</span>
                    <p className="text-xs text-white font-bold">{m.product.title}</p>
                  </div>
                  <p className="text-sm font-black text-[#FDCB02] font-mono">{m.quantity.toFixed(1)}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}