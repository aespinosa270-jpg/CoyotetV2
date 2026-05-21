/**
 * Cron NIGHTLY SUMMARY — corre cada noche a las 22:00 CDMX (04:00 UTC)
 *
 * Recopila KPIs del día y manda un resumen WhatsApp al admin (5215627301525)
 * para que Jack vea de un vistazo cómo va el bot sin tener que abrir dashboard.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "../_lib/guard";
import { prisma } from "@/lib/prisma";
import { countEventsForDay, getRecentEvents } from "@/lib/bot/observability/events";
import { sendText } from "@/lib/bot/services/meta/send";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/cron/nightly-summary" });

const ADMIN_PHONE = "5215627301525";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.coyotetextil.com";

export async function POST(req: NextRequest) {
  const auth = requireCronAuth(req);
  if (auth) return auth;

  try {
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setUTCHours(0, 0, 0, 0);

    // Paralelas: KPIs del día
    const [
      messagesToday,
      conversionsToday,
      errorsToday,
      ordersToday,
      escalationsToday,
      escalationsPending,
      objectionsToday,
    ] = await Promise.all([
      countEventsForDay("message", today),
      countEventsForDay("conversion", today),
      countEventsForDay("error", today),
      prisma.order.aggregate({
        where: {
          source: "bot_v2",
          status: { in: ["PAID", "DELIVERED"] },
          createdAt: { gte: todayStart },
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.botEscalation.count({
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.botEscalation.count({
        where: { estado: "pendiente" },
      }),
      getRecentEvents("objection", today, 100),
    ]);

    // Top producto vendido hoy
    const topProductsToday = await prisma.orderItem.groupBy({
      by: ["title"],
      where: {
        order: {
          source: "bot_v2",
          status: { in: ["PAID", "DELIVERED"] },
          createdAt: { gte: todayStart },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 3,
    });

    // Top objeción
    const objCounts: Record<string, number> = {};
    for (const ev of objectionsToday) {
      const tipo = (ev.data?.tipo as string) || (ev.data?.objecion as string) || "otra";
      objCounts[tipo] = (objCounts[tipo] || 0) + 1;
    }
    const topObjections = Object.entries(objCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Lead VIP pendiente (orden creada hoy pero no pagada)
    const leadPendiente = await prisma.order.findFirst({
      where: {
        source: "bot_v2",
        status: "PENDING",
        createdAt: { gte: todayStart },
        total: { gte: 5000 },
      },
      orderBy: { total: "desc" },
      select: { total: true, customerName: true, botPhone: true, customerPhone: true },
    });

    // ── Construir mensaje ──
    const ventasTxt = ordersToday._sum.total
      ? `$${ordersToday._sum.total.toLocaleString("es-MX", { maximumFractionDigits: 0 })} MXN`
      : "$0";

    const productsTxt = topProductsToday.length > 0
      ? topProductsToday
          .map((p) => `   • ${p.title} (${p._sum.quantity}kg)`)
          .join("\n")
      : "   • Sin ventas hoy";

    const objectionsTxt = topObjections.length > 0
      ? topObjections.map(([tipo, count]) => `   • ${tipo}: ${count}`).join("\n")
      : "   • Sin objeciones detectadas";

    const leadVipTxt = leadPendiente
      ? `\n🔥 LEAD VIP PENDIENTE:\n   • ${leadPendiente.customerName || "Sin nombre"} — $${leadPendiente.total.toLocaleString("es-MX")} MXN — orden sin pagar\n   • Phone: +${leadPendiente.botPhone || leadPendiente.customerPhone || "?"}`
      : "";

    const escalacionesTxt = escalationsToday > 0
      ? `\n🚨 Escalaciones del día: ${escalationsToday} (${escalationsPending} pendientes)`
      : "";

    const erroresTxt = errorsToday > 0 ? `\n⚠️ Errores: ${errorsToday}` : "";

    const fecha = today.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      timeZone: "America/Mexico_City",
    });

    const mensaje = `📊 *RESUMEN COYOTE BOT*
${fecha}

💬 Mensajes procesados: *${messagesToday}*
💸 Conversiones: *${conversionsToday}*
💰 Ventas pagadas: *${ventasTxt}* (${ordersToday._count.id} ${ordersToday._count.id === 1 ? "orden" : "órdenes"})

🏅 Top productos vendidos:
${productsTxt}

🤔 Top objeciones:
${objectionsTxt}${leadVipTxt}${escalacionesTxt}${erroresTxt}

📊 Dashboard completo:
${BASE_URL}/crm/admin/bot/dashboard`;

    // Enviar al admin
    const sent = await sendText(ADMIN_PHONE, mensaje);

    log.info(
      {
        messages: messagesToday,
        conversions: conversionsToday,
        ventas: ordersToday._sum.total,
        escalaciones: escalationsToday,
        sent,
      },
      "📊 Resumen nocturno enviado"
    );

    return NextResponse.json({
      ok: true,
      sent,
      kpis: {
        messages: messagesToday,
        conversions: conversionsToday,
        ventas: ordersToday._sum.total || 0,
        ordenesCount: ordersToday._count.id,
        errors: errorsToday,
        escalaciones: escalationsToday,
        pendientes: escalationsPending,
        topProductos: topProductsToday.length,
        topObjeciones: topObjections.length,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg }, "Error en nightly-summary");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Permitir GET para testing manual
export async function GET(req: NextRequest) {
  return POST(req);
}