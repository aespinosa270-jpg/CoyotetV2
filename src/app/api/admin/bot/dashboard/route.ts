/**
 * GET /api/admin/bot/dashboard
 *
 * Vista ejecutiva — agrega KPIs principales del bot en una sola llamada:
 *  - KPIs hoy: ventas, mensajes, conversiones, escalaciones pendientes
 *  - Series 7 días: mensajes + conversiones por día
 *  - Donut: escalaciones por razón
 *  - Top 5 productos vendidos (last 30d)
 *  - Top 5 objeciones recientes
 *  - Últimas 5 escalaciones pendientes
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_lib/guard";
import { prisma } from "@/lib/prisma";
import {
  getDailyCounts,
  countEventsForDay,
  getRecentEvents,
} from "@/lib/bot/observability/events";

export async function GET(_req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setUTCDate(today.getUTCDate() - 1);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setUTCDate(today.getUTCDate() - 30);

    const [
      // KPIs Redis events
      messagesToday,
      messagesYesterday,
      conversionsToday,
      conversionsYesterday,
      errorsToday,
      // Series 7 días
      messagesDaily,
      conversionsDaily,
      // Objections recientes
      recentObjections,
      // Prisma data
      ordersTodayBot,
      ordersAllTimeBot,
      escalationsPending,
      escalationsByReason,
      topProducts,
      lastEscalations,
    ] = await Promise.all([
      countEventsForDay("message", today),
      countEventsForDay("message", yesterday),
      countEventsForDay("conversion", today),
      countEventsForDay("conversion", yesterday),
      countEventsForDay("error", today),
      getDailyCounts("message", 7),
      getDailyCounts("conversion", 7),
      getRecentEvents("objection", today, 100),
      // Ventas hoy del bot (orders con source = bot_v2)
      prisma.order.aggregate({
        where: {
          source: "bot_v2",
          status: { in: ["PAID", "DELIVERED"] },
          createdAt: { gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) },
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      // Ventas TOTAL acumulado del bot
      prisma.order.aggregate({
        where: {
          source: "bot_v2",
          status: { in: ["PAID", "DELIVERED"] },
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      // Escalaciones pendientes
      prisma.botEscalation.count({ where: { estado: "pendiente" } }),
      // Escalaciones agrupadas por razón
      prisma.botEscalation.groupBy({
        by: ["razon"],
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: { razon: true },
      }),
      // Productos top vendidos (last 30d, bot only)
      prisma.orderItem.groupBy({
        by: ["title"],
        where: {
          order: {
            source: "bot_v2",
            status: { in: ["PAID", "DELIVERED"] },
            createdAt: { gte: thirtyDaysAgo },
          },
        },
        _sum: { quantity: true, price: true },
        _count: { id: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      // Últimas escalaciones pendientes
      prisma.botEscalation.findMany({
        where: { estado: "pendiente" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          phone: true,
          nombre: true,
          razon: true,
          contexto: true,
          createdAt: true,
        },
      }),
    ]);

    // ── Agregar objections por tipo ──
    const objCounts: Record<string, number> = {};
    for (const ev of recentObjections) {
      const tipo = (ev.data?.tipo as string) || (ev.data?.objecion as string) || "otra";
      objCounts[tipo] = (objCounts[tipo] || 0) + 1;
    }
    const topObjections = Object.entries(objCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // ── Construir series 7 días (combinar mensajes + conversiones) ──
    const dailySeries = messagesDaily.map((m, idx) => {
      const dayLabel = new Date(m.date + "T00:00:00Z").toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
      });
      return {
        date: m.date,
        dia: dayLabel,
        mensajes: m.count,
        conversiones: conversionsDaily[idx]?.count ?? 0,
      };
    });

    // ── Cambio porcentual ──
    const messagesChange = messagesYesterday === 0
      ? null
      : Math.round(((messagesToday - messagesYesterday) / messagesYesterday) * 100);
    const conversionsChange = conversionsYesterday === 0
      ? null
      : Math.round(((conversionsToday - conversionsYesterday) / conversionsYesterday) * 100);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      kpis: {
        ventasHoy: ordersTodayBot._sum.total || 0,
        ordenesHoy: ordersTodayBot._count.id,
        ventasTotalBot: ordersAllTimeBot._sum.total || 0,
        ordenesTotalBot: ordersAllTimeBot._count.id,
        mensajesHoy: messagesToday,
        mensajesAyer: messagesYesterday,
        mensajesChange: messagesChange,
        conversionesHoy: conversionsToday,
        conversionesAyer: conversionsYesterday,
        conversionesChange: conversionsChange,
        errorsToday,
        escalacionesPendientes: escalationsPending,
      },
      dailySeries,
      escalationsByReason: escalationsByReason.map((e) => ({
        razon: e.razon,
        count: e._count.razon,
      })),
      topProducts: topProducts.map((p) => ({
        titulo: p.title,
        cantidad: Number(p._sum.quantity) || 0,
        ingreso: Number(p._sum.price) || 0,
        ordenes: p._count.id,
      })),
      topObjections,
      lastEscalations,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}