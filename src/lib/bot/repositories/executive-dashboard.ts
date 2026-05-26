/**
 * Executive Dashboard Queries — KPIs avanzados del bot V2 para Jack.
 *
 * Agrupa varias queries en una sola llamada para reducir round-trips.
 * Se usa en /crm/admin/bot (dashboard principal).
 *
 * Estructura:
 *   - ventas7d: total ordenes + monto + items top
 *   - telasNoManejadas: telas pedidas fuera de catalogo (oportunidad)
 *   - aftercare: cola pending por tipo
 *   - salesAgent: contactos por priority + status
 *   - trust: top clientes por trust score
 *   - eventos24h: counts por tipo (message, error, conversion, etc.)
 *   - alertas: errors recientes + high-priority sin respuesta
 */
import { prisma } from "@/lib/prisma";
import { getRedis } from "./redis";
import { countEventsForDay } from "../observability/events";

export interface ExecutiveDashboard {
  ventas7d: {
    totalOrders: number;
    totalRevenue: number;
    avgTicket: number;
    topProducts: Array<{ title: string; qty: number; revenue: number }>;
  };
  telasNoManejadas: {
    totalRegistros: number;
    top: Array<{ tela: string; count: number; ultimoCliente: string | null }>;
  };
  aftercare: {
    pending: number;
    positive: number;
    complaints: number;
    proxima: { type: string; orderNumber: string | null; userName: string | null } | null;
  };
  salesAgent: {
    totalContactos: number;
    highPriority: number;     // priority >= 60
    awaitingFirst: number;    // status NEW
    contacted: number;
    converted: number;
  };
  trust: {
    promedio: number;
    fans: number;             // >= 90
    riesgo: number;           // < 30
    topFans: Array<{ name: string | null; score: number; ltv: number }>;
  };
  eventos24h: {
    messages: number;
    conversions: number;
    errors: number;
    hallucinations: number;
    objections: number;
  };
  alertas: {
    errores: number;
    sinRespuestaUrgente: number; // contacto con priority >= 80 sin attempt en 48h
  };
}

export async function getExecutiveDashboard(): Promise<ExecutiveDashboard> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  // ── 1. Ventas últimos 7 días ──
  const orders7d = await prisma.order.findMany({
    where: {
      status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
      createdAt: { gte: sevenDaysAgo },
    },
    include: {
      items: { select: { title: true, quantity: true, price: true } },
    },
  });

  const totalRevenue = orders7d.reduce((s, o) => s + o.total, 0);
  const totalOrders = orders7d.length;

  // Agrupar items por título para top products
  const itemsMap = new Map<string, { qty: number; revenue: number }>();
  for (const order of orders7d) {
    for (const item of order.items) {
      const existing = itemsMap.get(item.title) ?? { qty: 0, revenue: 0 };
      existing.qty += item.quantity;
      existing.revenue += (item.quantity ?? 0) * (item.price ?? 0);
      itemsMap.set(item.title, existing);
    }
  }
  const topProducts = Array.from(itemsMap.entries())
    .map(([title, data]) => ({ title, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // ── 2. Telas no manejadas (top + último cliente) ──
  const telasRaw = await prisma.telaNoManejada.groupBy({
    by: ["telaIdentificada"],
    _count: { _all: true },
    orderBy: { _count: { telaIdentificada: "desc" } },
    take: 5,
  });

  const telasNoManejadasTop = await Promise.all(
    telasRaw.map(async (t) => {
      const ultimo = await prisma.telaNoManejada.findFirst({
        where: { telaIdentificada: t.telaIdentificada },
        orderBy: { createdAt: "desc" },
        select: { clientePhone: true, clienteNombre: true },
      });
      return {
        tela: t.telaIdentificada,
        count: t._count._all,
        ultimoCliente: ultimo?.clienteNombre ?? ultimo?.clientePhone ?? null,
      };
    })
  );

  const totalTelasNoManejadas = await prisma.telaNoManejada.count();

  // ── 3. Aftercare ──
  const [aftercarePending, aftercarePositive, aftercareComplaints] = await Promise.all([
    prisma.aftercareEvent.count({ where: { outcome: "pending" } }),
    prisma.aftercareEvent.count({ where: { outcome: "positive_response" } }),
    prisma.aftercareEvent.count({ where: { outcome: "complaint" } }),
  ]);

  const aftercareProxima = await prisma.aftercareEvent.findFirst({
    where: { outcome: "pending" },
    orderBy: { triggeredAt: "asc" },
    select: {
      type: true,
      order: { select: { orderNumber: true } },
      user: { select: { name: true } },
    },
  });

  // ── 4. Sales Agent ──
  const [totalContactos, highPriority, awaitingFirst, contacted, converted] = await Promise.all([
    prisma.contactoOutbound.count(),
    prisma.contactoOutbound.count({ where: { reactivationPriority: { gte: 60 } } }),
    prisma.contactoOutbound.count({ where: { status: "NEW" } }),
    prisma.contactoOutbound.count({ where: { status: "CONTACTED" } }),
    prisma.contactoOutbound.count({ where: { status: "CONVERTED" } }),
  ]);

  // ── 5. Trust score ──
  const trustAgg = await prisma.user.aggregate({
    _avg: { trustScore: true },
    where: { trustEvents: { gt: 0 } },
  });

  const [fans, riesgo] = await Promise.all([
    prisma.user.count({ where: { trustScore: { gte: 90 } } }),
    prisma.user.count({ where: { trustScore: { lt: 30 }, trustEvents: { gt: 0 } } }),
  ]);

  const topFans = await prisma.user.findMany({
    where: { trustScore: { gte: 75 }, trustEvents: { gt: 0 } },
    orderBy: [{ trustScore: "desc" }, { ltv: "desc" }],
    take: 5,
    select: { name: true, trustScore: true, ltv: true },
  });

  // ── 6. Eventos últimas 24h ──
  const today = new Date();
  const [evMsg, evConv, evErr, evHallu, evObj] = await Promise.all([
    countEventsForDay("message", today),
    countEventsForDay("conversion", today),
    countEventsForDay("error", today),
    countEventsForDay("hallucination", today),
    countEventsForDay("objection", today),
  ]);

  // ── 7. Alertas ──
  const sinRespuestaUrgente = await prisma.contactoOutbound.count({
    where: {
      reactivationPriority: { gte: 80 },
      OR: [{ lastAttemptAt: null }, { lastAttemptAt: { lt: twoDaysAgo } }],
      status: { notIn: ["CONVERTED", "LOST"] },
    },
  });

  return {
    ventas7d: {
      totalOrders,
      totalRevenue,
      avgTicket: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      topProducts,
    },
    telasNoManejadas: {
      totalRegistros: totalTelasNoManejadas,
      top: telasNoManejadasTop,
    },
    aftercare: {
      pending: aftercarePending,
      positive: aftercarePositive,
      complaints: aftercareComplaints,
      proxima: aftercareProxima
        ? {
            type: aftercareProxima.type,
            orderNumber: aftercareProxima.order?.orderNumber ?? null,
            userName: aftercareProxima.user?.name ?? null,
          }
        : null,
    },
    salesAgent: {
      totalContactos,
      highPriority,
      awaitingFirst,
      contacted,
      converted,
    },
    trust: {
      promedio: Math.round(trustAgg._avg.trustScore ?? 70),
      fans,
      riesgo,
      topFans: topFans.map((f) => ({ name: f.name, score: f.trustScore, ltv: f.ltv })),
    },
    eventos24h: {
      messages: evMsg,
      conversions: evConv,
      errors: evErr,
      hallucinations: evHallu,
      objections: evObj,
    },
    alertas: {
      errores: evErr,
      sinRespuestaUrgente,
    },
  };
}

// ─── CHARTS DATA (series temporales últimos 30 días) ────────────

export interface ChartsData {
  /** Últimos 30 días con ventas + órdenes por día. */
  salesByDay: Array<{
    date: string; // "Mar 15"
    fullDate: string; // "2026-03-15"
    revenue: number;
    orders: number;
  }>;
  /** Últimos 30 días con mensajes + conversiones del bot. */
  activityByDay: Array<{
    date: string; // "Mar 15"
    fullDate: string;
    messages: number;
    conversions: number;
  }>;
  /** Últimos 7 días con errores + alucinaciones. */
  healthLast7Days: Array<{
    date: string;
    fullDate: string;
    errors: number;
    hallucinations: number;
  }>;
}

/**
 * Devuelve datos para las gráficas del Command Center.
 *
 * SalesByDay: una query SQL agrupada por día sobre Order PAID.
 * ActivityByDay: itera por 30 días llamando countEventsForDay (Redis).
 *   - Puede tardar más, pero es solo lectura y se cachea via revalidate=0.
 */
export async function getChartsData(): Promise<ChartsData> {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const days30Ago = new Date(today);
  days30Ago.setDate(days30Ago.getDate() - 30);
  days30Ago.setHours(0, 0, 0, 0);

  // ── 1. Ventas por día (últimos 30) ──
  const salesRaw: Array<{ day: Date; revenue: number; orders: bigint }> = await prisma.$queryRaw`
    SELECT
      DATE_TRUNC('day', "createdAt") as day,
      COALESCE(SUM("total"), 0)::float as revenue,
      COUNT(*)::bigint as orders
    FROM "Order"
    WHERE "createdAt" >= ${days30Ago}
      AND "status" IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED')
    GROUP BY day
    ORDER BY day ASC
  `;

  // Llenar días sin ventas con 0
  const salesByDay: ChartsData["salesByDay"] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(days30Ago);
    d.setDate(d.getDate() + i);
    const dateKey = d.toISOString().split("T")[0];
    const found = salesRaw.find(
      (r) => new Date(r.day).toISOString().split("T")[0] === dateKey
    );
    salesByDay.push({
      date: d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
      fullDate: dateKey,
      revenue: found ? Math.round(found.revenue) : 0,
      orders: found ? Number(found.orders) : 0,
    });
  }

  // ── 2. Actividad por día (mensajes + conversiones) ──
  const activityByDay: ChartsData["activityByDay"] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split("T")[0];
    try {
      const [messages, conversions] = await Promise.all([
        countEventsForDay("message", d),
        countEventsForDay("conversion", d),
      ]);
      activityByDay.push({
        date: d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
        fullDate: dateKey,
        messages: messages ?? 0,
        conversions: conversions ?? 0,
      });
    } catch {
      activityByDay.push({
        date: d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
        fullDate: dateKey,
        messages: 0,
        conversions: 0,
      });
    }
  }

  // ── 3. Salud (errores + alucinaciones últimos 7 días) ──
  const healthLast7Days: ChartsData["healthLast7Days"] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split("T")[0];
    try {
      const [errors, hallucinations] = await Promise.all([
        countEventsForDay("error", d),
        countEventsForDay("hallucination", d),
      ]);
      healthLast7Days.push({
        date: d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
        fullDate: dateKey,
        errors: errors ?? 0,
        hallucinations: hallucinations ?? 0,
      });
    } catch {
      healthLast7Days.push({
        date: d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
        fullDate: dateKey,
        errors: 0,
        hallucinations: 0,
      });
    }
  }

  return { salesByDay, activityByDay, healthLast7Days };
}