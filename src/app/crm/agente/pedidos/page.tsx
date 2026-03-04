import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import MisPedidosClient from "./_components/MisPedidosClient";

async function getMisPedidos(employeeId: string) {
  const orders = await prisma.routeOrder.findMany({
    where:   { employeeId },
    include: {
      items: true,
    },
    orderBy: { scheduledAt: "desc" },
  });

  const pendientes  = orders.filter((o) => o.status === "PENDIENTE").length;
  const enCamino    = orders.filter((o) => o.status === "EN_CAMINO" || o.status === "ASIGNADA").length;
  const completadas = orders.filter((o) => o.status === "COMPLETADA").length;
  const canceladas  = orders.filter((o) => o.status === "CANCELADA").length;

  return {
    orders: orders.map((o) => ({
      ...o,
      scheduledAt: o.scheduledAt?.toISOString() ?? null,
      createdAt:   o.createdAt.toISOString(),
      updatedAt:   o.updatedAt.toISOString(),
    })),
    kpis: { pendientes, enCamino, completadas, canceladas },
  };
}

export default async function MisPedidosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const employee = await prisma.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true },
  });
  if (!employee) redirect("/login");

  const { orders, kpis } = await getMisPedidos(employee.id);

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">Mi CRM / Logística</p>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
          Mis <span className="text-[#FDCB02]">Pedidos</span>
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        {[
          { label: "Pendientes",  value: kpis.pendientes,  color: "text-amber-400"   },
          { label: "En Camino",   value: kpis.enCamino,    color: "text-blue-400"    },
          { label: "Completadas", value: kpis.completadas, color: "text-emerald-400" },
          { label: "Canceladas",  value: kpis.canceladas,  color: "text-zinc-600"    },
        ].map((k) => (
          <div key={k.label} className="bg-[#0a0a0a] border border-white/[0.03] p-4 rounded-2xl">
            <p className="text-[8px] uppercase font-black tracking-widest text-zinc-600 mb-1">{k.label}</p>
            <p className={`text-xl font-mono font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <MisPedidosClient orders={orders} />
    </div>
  );
}