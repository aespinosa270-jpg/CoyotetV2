import { prisma } from "@/lib/prisma";
import { Search } from "lucide-react";
import AsignadosClient from "@/app/crm/admin/leads/asignados/_components/AsignadosClient";

// Carga los deals asignados al agente en sesión
// Si es ADMIN ve todos; si es VENDEDORA solo los suyos
async function getAsignadosData(employeeId?: string) {
  const [deals, stats] = await Promise.all([
    prisma.deal.findMany({
      where: {
        status: { notIn: ["CERRADO_GANADO", "CERRADO_PERDIDO"] },
        ...(employeeId ? { employeeId } : {}),
      },
      include: {
        employee: { select: { id: true, name: true } },
        product:  { select: { id: true, title: true, sku: true, unit: true } },
        user:     { select: { id: true, name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.deal.aggregate({
      where: {
        status: { notIn: ["CERRADO_GANADO", "CERRADO_PERDIDO"] },
        ...(employeeId ? { employeeId } : {}),
      },
      _sum:   { value: true },
      _count: { id:    true },
    }),
  ]);

  const altaPrioridad = deals.filter((d) => d.value > 50000).length;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const pendientesHoy = deals.filter(
    (d) => new Date(d.updatedAt) >= hoy
  ).length;

  return {
    deals,
    total:          stats._count.id ?? 0,
    valorProyectado: stats._sum.value ?? 0,
    altaPrioridad,
    pendientesHoy,
  };
}

export default async function AsignadosPage() {
  // Detectar si el admin quiere ver todos o solo los suyos
  // Por ahora muestra todos — agrega filtro por sesión si lo necesitas
  const data = await getAsignadosData();

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">CRM / Pipeline</p>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
            LEADS <span className="text-[#FDCB02]">ASIGNADOS</span>
          </h1>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        {[
          { label: "Total Asignados",   value: data.total,                                                   color: "text-white"        },
          { label: "Prioridad Alta",    value: data.altaPrioridad,                                           color: "text-red-400"      },
          { label: "Activos Hoy",       value: data.pendientesHoy,                                           color: "text-[#FDCB02]"   },
          { label: "Venta Proyectada",  value: `$${(data.valorProyectado / 1000).toFixed(0)}k`,             color: "text-emerald-400"  },
        ].map((s) => (
          <div key={s.label} className="bg-[#0a0a0a] border border-white/[0.03] p-4 rounded-2xl">
            <p className="text-[8px] uppercase font-black tracking-widest text-zinc-600 mb-1">{s.label}</p>
            <p className={`text-xl font-mono font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla — Client Component para búsqueda */}
      <AsignadosClient deals={data.deals as any} />
    </div>
  );
}