import { prisma } from "@/lib/prisma";
import { UserCheck, PhoneCall, TrendingUp, ShieldAlert } from "lucide-react";
import AgentesClient from "./_components/AgentesClient";

async function getAgentesData() {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    select: {
      id: true, name: true, email: true, role: true,
      createdAt: true,
      attendances: {
        where: {
          checkIn: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        select: { checkIn: true, checkOut: true },
        orderBy: { checkIn: "desc" },
        take: 1,
      },
      deals: {
        select: { id: true, value: true, status: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const dealStats = await prisma.deal.groupBy({
    by: ["employeeId"],
    where: {
      status: "CERRADO_GANADO",
      updatedAt: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
    _sum:   { value: true },
    _count: { id:    true },
  });

  const statsByEmployee = new Map(dealStats.map((s) => [s.employeeId, s]));

  // Serializar Dates a string para evitar error al cruzar Server→Client
  const agentes = employees.map((e) => {
    const stats    = statsByEmployee.get(e.id);
    const ganados  = e.deals.filter((d) => d.status === "CERRADO_GANADO").length;
    const cerrados = e.deals.filter(
      (d) => d.status === "CERRADO_GANADO" || d.status === "CERRADO_PERDIDO"
    ).length;
    const winRate        = cerrados > 0 ? Math.round((ganados / cerrados) * 100) : 0;
    const lastAttendance = e.attendances[0] ?? null;
    const isOnline       = lastAttendance != null && lastAttendance.checkOut == null;

    return {
      id:          e.id,
      name:        e.name,
      email:       e.email,
      role:        e.role,
      isOnline,
      lastCheckIn: lastAttendance?.checkIn?.toISOString() ?? null, // ← string, no Date
      totalDeals:  e.deals.length,
      ventasMes:   stats?._sum.value ?? 0,
      winRate,
    };
  });

  const activos           = agentes.filter((a) => a.isOnline).length;
  const ventasTotales     = agentes.reduce((s, a) => s + a.ventasMes, 0);
  const winRatePromedio   =
    agentes.length > 0
      ? Math.round(agentes.reduce((s, a) => s + a.winRate, 0) / agentes.length)
      : 0;

  return { agentes, activos, ventasTotales, winRatePromedio };
}

const fmt = (v: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(v);

export default async function AgentesPage() {
  const { agentes, activos, ventasTotales, winRatePromedio } =
    await getAgentesData();

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase text-white leading-none">
            Fuerza de <span className="text-[#FDCB02]">Ventas</span>
          </h1>
          <p className="text-zinc-500 text-xs tracking-widest uppercase mt-1">
            Monitor de Agentes · {agentes.length} en sistema
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Agentes Activos",  value: `${activos}/${agentes.length}`, icon: UserCheck,  color: "text-emerald-500" },
          { label: "Deals en Pipeline",value: agentes.reduce((s,a) => s + a.totalDeals, 0),    icon: PhoneCall,   color: "text-white"       },
          { label: "Ventas (Mes)",     value: fmt(ventasTotales),                               icon: TrendingUp,  color: "text-[#FDCB02]"  },
          { label: "Win Rate Prom.",   value: `${winRatePromedio}%`,                            icon: ShieldAlert, color: "text-zinc-400"    },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <kpi.icon size={48} className={kpi.color} />
            </div>
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2">{kpi.label}</p>
            <p className={`text-3xl font-light tracking-tight ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Client Component — recibe datos ya serializados */}
      <AgentesClient agentes={agentes} />
    </div>
  );
}