/**
 * Stats reales de ordenes del bot (Prisma) para el dashboard.
 * Separa lo que vive en Postgres (ordenes/dinero real) de lo que vive
 * en Redis (perfiles/cartera). El dashboard mezcla ambas fuentes.
 */
import { prisma } from "@/lib/prisma";

export interface OrderStats {
  pedidosPagados: number;      // ordenes PAID+ (de verdad cobradas)
  ventasTotales: number;       // monto cobrado acumulado
  ordenesPendientes: number;   // PENDING (cotizaciones sin pagar)
  montoPorCobrar: number;      // suma de PENDING
  ventas7dMonto: number;       // cobrado ultimos 7 dias
  ventas7dCount: number;       // ordenes pagadas ultimos 7 dias
}

const COBRADO = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export async function getOrderStats(): Promise<OrderStats> {
  try {
    const sieteDias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [pagadas, pendientes, ventas7d] = await Promise.all([
      prisma.order.aggregate({
        where: { source: "bot_v2", status: { in: [...COBRADO] } },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.order.aggregate({
        where: { source: "bot_v2", status: "PENDING" },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.order.aggregate({
        where: { source: "bot_v2", status: { in: [...COBRADO] }, createdAt: { gte: sieteDias } },
        _sum: { total: true },
        _count: { id: true },
      }),
    ]);
    return {
      pedidosPagados: pagadas._count.id,
      ventasTotales: Number(pagadas._sum.total) || 0,
      ordenesPendientes: pendientes._count.id,
      montoPorCobrar: Number(pendientes._sum.total) || 0,
      ventas7dMonto: Number(ventas7d._sum.total) || 0,
      ventas7dCount: ventas7d._count.id,
    };
  } catch (err) {
    console.error("getOrderStats error:", err);
    return { pedidosPagados: 0, ventasTotales: 0, ordenesPendientes: 0, montoPorCobrar: 0, ventas7dMonto: 0, ventas7dCount: 0 };
  }
}
