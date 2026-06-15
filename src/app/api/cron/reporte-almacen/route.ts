/**
 * Cron REPORTE DE ALMACEN (12 PM).
 * Junta pedidos activos (PAID / PROCESSING / SHIPPED) y arma un resumen
 * de que hay que surtir hoy. Lo manda por WhatsApp al numero de almacen
 * (env ALMACEN_REPORT_PHONE) y lo registra como evento en el CRM.
 *
 * Llamar desde cron-job.org:
 *   POST /api/cron/reporte-almacen
 *   Authorization: Bearer ${CRON_SECRET}
 */
import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "../_lib/guard";
import { prisma } from "@/lib/prisma";
import { sendText } from "@/lib/bot/services/meta/send";
import { getEnv } from "@/lib/bot/config/env";
import { getLogger } from "@/lib/bot/observability/logger";
import { recordEvent } from "@/lib/bot/observability/events";

const log = getLogger({ module: "api/cron/reporte-almacen" });

const ESTADO_LABEL: Record<string, string> = {
  PAID: "Por preparar",
  PROCESSING: "Preparando",
  SHIPPED: "Enviada (hoy)",
};

function buildReporte(orders: any[]): string {
  const now = new Date();
  const fecha = now.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  const hora = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  if (orders.length === 0) {
    return `📦 *REPORTE DE ALMACEN*\n${fecha} · ${hora}\n\nNo hay pedidos activos por surtir. Todo al dia 👌`;
  }

  // Agrupar por estado
  const porEstado: Record<string, any[]> = {};
  for (const o of orders) {
    (porEstado[o.status] ??= []).push(o);
  }

  let totalKg = 0;
  const lineas: string[] = [];
  let n = 1;

  for (const estado of ["PAID", "PROCESSING", "SHIPPED"]) {
    const grupo = porEstado[estado];
    if (!grupo || grupo.length === 0) continue;
    lineas.push(`\n*${ESTADO_LABEL[estado]}* (${grupo.length})`);
    for (const o of grupo) {
      const items = (o.items ?? []) as any[];
      const telas = items.map((i) => {
        const q = Number(i.quantity) || 0;
        if ((i.unit ?? "kg").toLowerCase().includes("kg")) totalKg += q;
        return `${q} ${i.unit ?? "kg"} ${i.title}`;
      });
      const detalle = telas.length > 0 ? telas.join(", ") : "sin detalle";
      lineas.push(`${n}. *${o.customerName || "Cliente"}* — ${detalle}`);
      n++;
    }
  }

  const totalKgTxt = totalKg > 0 ? `\n\n📊 Total aprox: *${totalKg.toLocaleString("es-MX")} kg* en ${orders.length} pedido${orders.length === 1 ? "" : "s"}` : `\n\n📊 ${orders.length} pedido${orders.length === 1 ? "" : "s"} activo${orders.length === 1 ? "" : "s"}`;

  return `📦 *REPORTE DE ALMACEN*\n${fecha} · ${hora}${lineas.join("\n")}${totalKgTxt}`;
}

async function runReporteAlmacen(dryRun = false) {
  // Pedidos activos: por preparar + preparando + enviadas hoy
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { status: { in: ["PAID", "PROCESSING"] } },
        { status: "SHIPPED", shippedAt: { gte: inicioHoy } },
      ],
    },
    orderBy: { createdAt: "asc" },
    include: { items: true },
  });

  const reporte = buildReporte(orders);

  // Registrar en el CRM (queda en eventos / metricas)
  await recordEvent({
    type: "reporte_almacen" as any,
    data: { fecha: new Date().toISOString(), pedidos: orders.length, texto: reporte },
  } as any).catch(() => {});

  if (dryRun) {
    return { dryRun: true, pedidos: orders.length, reporte };
  }

  // Enviar por WhatsApp al numero de almacen
  const env = getEnv() as any;
  const phone = env.ALMACEN_REPORT_PHONE || process.env.ALMACEN_REPORT_PHONE;
  let enviado = false;
  if (phone) {
    enviado = await sendText(phone, reporte);
  } else {
    log.warn({}, "ALMACEN_REPORT_PHONE no configurado — reporte no enviado por WhatsApp (pero si registrado)");
  }

  return { enviado, pedidos: orders.length, phone: phone ? "configurado" : "FALTA configurar ALMACEN_REPORT_PHONE" };
}

export async function POST(req: NextRequest) {
  const auth = requireCronAuth(req);
  if (auth) return auth;

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  try {
    const result = await runReporteAlmacen(dryRun);
    log.info({ result }, "Reporte de almacen completado");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg }, "Reporte de almacen fallo");
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "cron/reporte-almacen",
    descripcion: "Reporte diario de pedidos por surtir. Programar en cron-job.org a las 12 PM. Usa ?dryRun=1 para probar sin enviar.",
  });
}
