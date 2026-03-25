import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Target, Users, Ticket, PhoneCall,
  ShoppingBag, ArrowUpRight, TrendingUp,
  CheckCircle2, Clock, ArrowRight,
} from "lucide-react";
import { auth } from "@/auth";

async function getAgenteDashboard(employeeId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    misDeals,
    misClientes,
    misTickets,
    misInteracciones,
    misPedidos,
    dealsGanados,
    ultimasInteracciones,
    ticketsUrgentes,
  ] = await Promise.all([
    // Deals activos
    prisma.deal.count({
      where: { employeeId, status: { notIn: ["CERRADO_GANADO", "CERRADO_PERDIDO"] } },
    }),
    // Clientes únicos con deals ganados
    prisma.deal.findMany({
      where:  { employeeId, status: "CERRADO_GANADO" },
      select: { userId: true },
      distinct: ["userId"],
    }),
    // Tickets pendientes
    prisma.ticket.count({
      where: { employeeId, status: { in: ["ABIERTO", "EN_REVISION"] } },
    }),
    // Interacciones de hoy
    prisma.interaction.count({
      where: { employeeId, date: { gte: today } },
    }),
    // Pedidos activos (rutas asignadas)
    prisma.routeOrder.count({
      where: { employeeId, status: { in: ["PENDIENTE", "ASIGNADA", "EN_CAMINO"] } },
    }),
    // Deals ganados este mes
    prisma.deal.aggregate({
      where: {
        employeeId,
        status:    "CERRADO_GANADO",
        updatedAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
      },
      _sum:   { value: true },
      _count: { id:    true },
    }),
    // Últimas 4 interacciones
    prisma.interaction.findMany({
      where:   { employeeId },
      orderBy: { date: "desc" },
      take:    4,
      include: { user: { select: { name: true, email: true } } },
    }),
    // Mis tickets urgentes
    prisma.ticket.findMany({
      where:   { employeeId, priority: "URGENTE", status: "ABIERTO" },
      take:    3,
      orderBy: { createdAt: "desc" },
      select:  { id: true, subject: true, ticketNumber: true },
    }),
  ]);

  return {
    misDeals,
    misClientes:         misClientes.length,
    misTickets,
    misInteracciones,
    misPedidos,
    ventasMes:           dealsGanados._sum.value ?? 0,
    dealsGanadosMes:     dealsGanados._count.id,
    ultimasInteracciones,
    ticketsUrgentes,
  };
}

const fmt = (v: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(v);

const fmtShort = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`;
  return fmt(v);
};

export default async function AgenteDashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const employee = await prisma.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true, name: true },
  });
  if (!employee) redirect("/login");

  const d = await getAgenteDashboard(employee.id);

  const kpis = [
    { label: "Deals Activos",      value: d.misDeals,           icon: Target,      color: "text-[#FDCB02]", href: "/crm/agente/pipeline"      },
    { label: "Mis Clientes",       value: d.misClientes,        icon: Users,       color: "text-sky-400",   href: "/crm/agente/clientes"      },
    { label: "Tickets Pendientes", value: d.misTickets,         icon: Ticket,      color: d.misTickets > 0 ? "text-red-400" : "text-emerald-400", href: "/crm/agente/tickets" },
    { label: "Interacciones Hoy",  value: d.misInteracciones,   icon: PhoneCall,   color: "text-violet-400",href: "/crm/agente/interacciones"  },
  ];

  const TYPE_LABEL: Record<string, string> = {
    LLAMADA:    "Llamada",
    WHATSAPP:   "WhatsApp",
    CORREO:     "Correo",
    PRESENCIAL: "Presencial",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <div className="border-b border-white/[0.06] pb-6">
        <p className="text-[9px] tracking-[0.3em] text-zinc-600 uppercase mb-1">Mi Panel</p>
        <h1 className="text-3xl font-[1000] uppercase tracking-tighter text-white leading-none">
          Hola, <span className="text-[#FDCB02]">{employee.name.split(" ")[0]}</span>
        </h1>
        <p className="text-xs text-zinc-600 font-mono mt-2 uppercase tracking-widest">
          Resumen de tu actividad comercial
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Link key={i} href={kpi.href}
            className="bg-[#0a0a0a] border border-white/[0.04] p-5 rounded-2xl relative overflow-hidden group hover:border-white/10 transition-all flex flex-col justify-between h-32"
          >
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">{kpi.label}</span>
              <kpi.icon size={15} className={kpi.color} />
            </div>
            <div>
              <p className="text-4xl font-[900] text-white tracking-tighter">{kpi.value}</p>
            </div>
            <ArrowUpRight size={12}
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600"
            />
            <div className={`absolute -bottom-8 -right-8 w-24 h-24 blur-[40px] rounded-full opacity-5 group-hover:opacity-15 transition-opacity ${kpi.color}`} />
          </Link>
        ))}
      </div>

      {/* Ventas del mes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#FDCB02]/5 border border-[#FDCB02]/20 rounded-2xl p-6 relative overflow-hidden">
          <TrendingUp className="absolute -right-3 -bottom-3 text-[#FDCB02]/10" size={80} />
          <p className="text-[9px] font-black uppercase tracking-widest text-[#FDCB02] mb-2">Ventas Este Mes</p>
          <p className="text-3xl font-mono font-bold text-white">{fmtShort(d.ventasMes)}</p>
          <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">
            {d.dealsGanadosMes} deal{d.dealsGanadosMes !== 1 ? "s" : ""} cerrado{d.dealsGanadosMes !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="bg-[#0a0a0a] border border-white/[0.04] rounded-2xl p-6">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-2">Pedidos Activos</p>
          <p className="text-3xl font-mono font-bold text-white">{d.misPedidos}</p>
          <Link href="/crm/agente/pedidos"
            className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-[#FDCB02] transition-colors uppercase tracking-widest mt-2 font-bold"
          >
            Ver pedidos <ArrowRight size={10} />
          </Link>
        </div>

        {/* Tickets urgentes */}
        <div className="bg-[#0a0a0a] border border-red-500/10 rounded-2xl p-5 flex flex-col">
          <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-3">
            Mis Urgentes
          </p>
          {d.ticketsUrgentes.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2" />
                <p className="text-[10px] text-zinc-700 uppercase tracking-widest">Sin urgentes</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 flex-1">
              {d.ticketsUrgentes.map((t) => (
                <Link key={t.id} href="/crm/agente/tickets"
                  className="flex items-start gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10 hover:border-red-500/30 transition-colors block"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0 animate-pulse" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-zinc-300 truncate">{t.subject}</p>
                    <p className="text-[9px] font-mono text-zinc-600">{t.ticketNumber}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Últimas interacciones */}
      <div className="bg-[#0a0a0a] border border-white/[0.04] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
          <h3 className="text-xs font-[900] uppercase tracking-widest text-white flex items-center gap-2">
            <PhoneCall size={13} className="text-[#FDCB02]" /> Últimas Interacciones
          </h3>
          <Link href="/crm/agente/interacciones"
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-[#FDCB02] transition-colors flex items-center gap-1"
          >
            Ver todas <ArrowRight size={11} />
          </Link>
        </div>
        {d.ultimasInteracciones.length === 0 ? (
          <p className="text-[10px] text-zinc-700 text-center py-8 uppercase tracking-widest">
            Sin interacciones registradas
          </p>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {d.ultimasInteracciones.map((i) => (
              <div key={i.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                    <PhoneCall size={11} className="text-zinc-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-300 truncate">
                      {i.user?.name ?? i.user?.email ?? "Cliente"}
                    </p>
                    <p className="text-[9px] text-zinc-600 uppercase tracking-widest">
                      {TYPE_LABEL[i.type] ?? i.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Clock size={10} className="text-zinc-700" />
                  <p className="text-[10px] font-mono text-zinc-600">
                    {new Date(i.date).toLocaleDateString("es-MX", {
                      day: "2-digit", month: "short",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}