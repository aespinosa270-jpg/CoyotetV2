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
    // 🐛 FIX: Clientes únicos asignados al agente (Sin importar el estatus del deal)
    prisma.deal.findMany({
      where:  { employeeId }, 
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
    misClientes:         misClientes.length, // 👈 Ahora sumará correctamente
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
    { label: "Deals Activos",      value: d.misDeals,          icon: Target,      color: "text-[#FDCB02]", href: "/crm/agente/pipeline"      },
    { label: "Mis Clientes",       value: d.misClientes,        icon: Users,       color: "text-blue-500",  href: "/crm/agente/clientes"      },
    { label: "Tickets Pendientes", value: d.misTickets,         icon: Ticket,      color: d.misTickets > 0 ? "text-red-500" : "text-emerald-500", href: "/crm/agente/tickets" },
    { label: "Interacciones Hoy",  value: d.misInteracciones,   icon: PhoneCall,   color: "text-violet-500",href: "/crm/agente/interacciones"  },
  ];

  const TYPE_LABEL: Record<string, string> = {
    LLAMADA:    "Llamada",
    WHATSAPP:   "WhatsApp",
    CORREO:     "Correo",
    PRESENCIAL: "Presencial",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* Header - FIXED THEME */}
      <div className="border-b border-gray-200 pb-6">
        <p className="text-[9px] tracking-[0.3em] text-gray-500 uppercase mb-1">Mi Panel</p>
        <h1 className="text-3xl font-[1000] uppercase tracking-tighter text-black leading-none">
          Hola, <span className="text-[#FDCB02]">{employee.name.split(" ")[0]}</span>
        </h1>
        <p className="text-xs text-gray-500 font-mono mt-2 uppercase tracking-widest font-bold">
          Resumen de tu actividad comercial
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Link key={i} href={kpi.href}
            className="bg-white border border-gray-200 p-5 rounded-2xl relative overflow-hidden group hover:border-gray-300 hover:shadow-md transition-all flex flex-col justify-between h-32 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{kpi.label}</span>
              <kpi.icon size={15} className={kpi.color} />
            </div>
            <div>
              <p className="text-4xl font-[900] text-black tracking-tighter">{kpi.value}</p>
            </div>
            <ArrowUpRight size={12}
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400"
            />
            <div className={`absolute -bottom-8 -right-8 w-24 h-24 blur-[40px] rounded-full opacity-10 group-hover:opacity-20 transition-opacity ${kpi.color}`} />
          </Link>
        ))}
      </div>

      {/* Ventas del mes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#FDCB02]/10 border border-[#FDCB02]/30 rounded-2xl p-6 relative overflow-hidden shadow-sm">
          <TrendingUp className="absolute -right-3 -bottom-3 text-[#FDCB02]/20" size={80} />
          <p className="text-[9px] font-black uppercase tracking-widest text-yellow-600 mb-2">Ventas Este Mes</p>
          <p className="text-3xl font-mono font-bold text-black">{fmtShort(d.ventasMes)}</p>
          <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-widest font-bold">
            {d.dealsGanadosMes} deal{d.dealsGanadosMes !== 1 ? "s" : ""} cerrado{d.dealsGanadosMes !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Pedidos Activos</p>
          <p className="text-3xl font-mono font-bold text-black">{d.misPedidos}</p>
          <Link href="/crm/agente/pedidos"
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-black transition-colors uppercase tracking-widest mt-2 font-bold"
          >
            Ver pedidos <ArrowRight size={10} />
          </Link>
        </div>

        {/* Tickets urgentes */}
        <div className="bg-white border border-red-100 rounded-2xl p-5 flex flex-col shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-3">
            Mis Urgentes
          </p>
          {d.ticketsUrgentes.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2" />
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Sin urgentes</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 flex-1">
              {d.ticketsUrgentes.map((t) => (
                <Link key={t.id} href="/crm/agente/tickets"
                  className="flex items-start gap-2 p-2 rounded-lg bg-red-50 border border-red-100 hover:border-red-200 transition-colors block"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0 animate-pulse" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-black truncate">{t.subject}</p>
                    <p className="text-[9px] font-mono text-gray-500">{t.ticketNumber}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Últimas interacciones */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-[900] uppercase tracking-widest text-black flex items-center gap-2">
            <PhoneCall size={13} className="text-[#FDCB02]" /> Últimas Interacciones
          </h3>
          <Link href="/crm/agente/interacciones"
            className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors flex items-center gap-1"
          >
            Ver todas <ArrowRight size={11} />
          </Link>
        </div>
        {d.ultimasInteracciones.length === 0 ? (
          <p className="text-[10px] text-gray-500 text-center py-8 uppercase tracking-widest font-bold">
            Sin interacciones registradas
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {d.ultimasInteracciones.map((i) => (
              <div key={i.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                    <PhoneCall size={11} className="text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-black truncate">
                      {i.user?.name ?? i.user?.email ?? "Cliente"}
                    </p>
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">
                      {TYPE_LABEL[i.type] ?? i.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Clock size={10} className="text-gray-400" />
                  <p className="text-[10px] font-mono text-gray-500">
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