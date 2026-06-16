/**
 * Hoy — el copiloto El Coyote. Server: carga escalaciones + stats reales.
 */
import { getDashboardMetrics } from "@/lib/bot/repositories/admin-queries";
import { getOrderStats } from "@/lib/bot/repositories/order-stats";
import { countEventsForDay } from "@/lib/bot/observability/events";
import { prisma } from "@/lib/prisma";
import HoyBoard from "./_components/HoyBoard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HoyPage() {
  const [orders, metrics, escalaciones, mensajesHoy] = await Promise.all([
    getOrderStats(),
    getDashboardMetrics().catch(() => null),
    prisma.botEscalation.findMany({
      where: { estado: "pendiente" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, phone: true, nombre: true, razon: true, contexto: true, createdAt: true },
    }).catch(() => []),
    countEventsForDay("message", new Date()).catch(() => 0),
  ]);

  return (
    <HoyBoard
      orders={orders}
      mensajesHoy={mensajesHoy}
      escalaciones={escalaciones.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }))}
      topObjecion={metrics?.topObjecionesGlobales?.[0] ?? null}
    />
  );
}
