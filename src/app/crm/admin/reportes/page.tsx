import { prisma } from "@/lib/prisma";
import ReportesClient from "./_components/ReportesClient";

async function getReportesData() {
  const now       = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startPrev  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endPrev    = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    // Ventas
    ventasMes,
    ventasPrev,
    // Deals
    dealStats,
    // Clientes nuevos
    clientesMes,
    clientesPrev,
    // Performance agentes
    agentDeals,
    // Top productos
    topProductos,
    // Ventas por mes (últimos 6)
    ventasPorMes,
  ] = await Promise.all([
    // Ventas mes actual
    prisma.deal.aggregate({
      where:  { status: "CERRADO_GANADO", updatedAt: { gte: startMonth } },
      _sum:   { value: true },
      _count: { id:    true },
    }),
    // Ventas mes anterior
    prisma.deal.aggregate({
      where:  { status: "CERRADO_GANADO", updatedAt: { gte: startPrev, lte: endPrev } },
      _sum:   { value: true },
    }),
    // Deals totales y ganados
    prisma.deal.groupBy({
      by:     ["status"],
      _count: { id: true },
    }),
    // Clientes nuevos este mes
    prisma.user.count({ where: { createdAt: { gte: startMonth } } }),
    // Clientes nuevos mes anterior
    prisma.user.count({ where: { createdAt: { gte: startPrev, lte: endPrev } } }),
    // Performance por agente
    prisma.deal.groupBy({
      by:     ["employeeId"],
      where:  { status: "CERRADO_GANADO" },
      _sum:   { value: true },
      _count: { id:    true },
      orderBy:{ _sum:  { value: "desc" } },
      take:   5,
    }),
    // Top productos por deals ganados
    prisma.deal.groupBy({
      by:     ["productId"],
      where:  { status: "CERRADO_GANADO", productId: { not: null } },
      _sum:   { value: true },
      _count: { id:    true },
      orderBy:{ _sum:  { value: "desc" } },
      take:   5,
    }),
    // Ventas últimos 6 meses
    Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const start = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        const end   = new Date(now.getFullYear(), now.getMonth() - 4 + i, 0);
        return prisma.deal.aggregate({
          where: { status: "CERRADO_GANADO", updatedAt: { gte: start, lte: end } },
          _sum:  { value: true },
        }).then((r) => ({
          label: start.toLocaleDateString("es-MX", { month: "short" }),
          value: r._sum.value ?? 0,
        }));
      })
    ),
  ]);

  // Enriquecer agentes con nombre
  const agentIds     = agentDeals.map((a) => a.employeeId);
  const employeeList = await prisma.employee.findMany({
    where:  { id: { in: agentIds } },
    select: { id: true, name: true },
  });
  const empMap = new Map(employeeList.map((e) => [e.id, e.name]));

  // Total deals para winRate
  const totalDeals  = dealStats.reduce((s, d) => s + d._count.id, 0);
  const ganadosCount = dealStats.find((d) => d.status === "CERRADO_GANADO")?._count.id ?? 0;
  const winRate     = totalDeals > 0 ? Math.round((ganadosCount / totalDeals) * 100) : 0;

  // Variaciones %
  const ventasActual = ventasMes._sum.value ?? 0;
  const ventasAnterior = ventasPrev._sum.value ?? 0;
  const ventasChange = ventasAnterior > 0
    ? Math.round(((ventasActual - ventasAnterior) / ventasAnterior) * 100)
    : 0;

  const clientesChange = clientesPrev > 0
    ? Math.round(((clientesMes - clientesPrev) / clientesPrev) * 100)
    : 0;

  // Ticket promedio
  const ticketPromedio = ganadosCount > 0
    ? Math.round(ventasActual / ganadosCount)
    : 0;

  // Enriquecer productos con nombre
  const prodIds  = topProductos.map((p) => p.productId!).filter(Boolean);
  const prodList = await prisma.product.findMany({
    where:  { id: { in: prodIds } },
    select: { id: true, title: true },
  });
  const prodMap  = new Map(prodList.map((p) => [p.id, p.title]));
  const maxProd  = topProductos[0]?._sum.value ?? 1;

  return {
    kpis: {
      ventasActual,
      ventasChange,
      dealsGanados:   ganadosCount,
      winRate,
      clientesMes,
      clientesChange,
      ticketPromedio,
    },
    ventasPorMes,
    topProductos: topProductos.map((p) => ({
      name:  prodMap.get(p.productId!) ?? "Sin nombre",
      value: p._sum.value ?? 0,
      share: Math.round(((p._sum.value ?? 0) / maxProd) * 100),
    })),
    agentes: agentDeals.map((a) => ({
      id:      a.employeeId,
      name:    empMap.get(a.employeeId) ?? "Agente",
      deals:   a._count.id,
      total:   a._sum.value ?? 0,
    })),
  };
}

export default async function ReportesPage() {
  const data = await getReportesData();
  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden">
      <div className="shrink-0">
        <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">CRM / Inteligencia</p>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
          REPORTES & <span className="text-[#FDCB02]">ANALÍTICA</span>
        </h1>
      </div>
      <ReportesClient data={data} />
    </div>
  );
}