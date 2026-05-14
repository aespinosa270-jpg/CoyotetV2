/**
 * GET /api/admin/bot/metrics
 *
 * Sirve datos agregados para la página de métricas del dashboard.
 * Tipos disponibles (param ?type=): message | conversion | error | hallucination
 *                                    vision | objection | rag_used | reminder_sent
 *                                    reactivation_sent
 * Query params:
 *   ?type=message&days=30           → daily counts del último mes
 *   ?type=error&recent=true&limit=50 → eventos recientes detallados
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_lib/guard";
import {
  countEventsForDay,
  getDailyCounts,
  getRecentEvents,
  type EventType,
} from "@/lib/bot/observability/events";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/admin/bot/metrics" });

const VALID_TYPES: EventType[] = [
  "message",
  "conversion",
  "error",
  "hallucination",
  "vision",
  "objection",
  "rag_used",
  "reminder_sent",
  "reactivation_sent",
];

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const params = req.nextUrl.searchParams;
  const type = params.get("type") as EventType | null;
  const recent = params.get("recent") === "true";
  const days = Number(params.get("days") ?? "30");
  const limit = Number(params.get("limit") ?? "50");

  // Sin type: devolver overview de TODOS los tipos
  if (!type) {
    return NextResponse.json(await buildOverview());
  }

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `type inválido. Válidos: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  if (recent) {
    const events = await getRecentEvents(type, new Date(), limit);
    return NextResponse.json({ events });
  }

  const counts = await getDailyCounts(type, Math.min(days, 90));
  const total = counts.reduce((acc, d) => acc + d.count, 0);
  const today = counts[counts.length - 1]?.count ?? 0;
  const yesterday = counts[counts.length - 2]?.count ?? 0;
  const change =
    yesterday === 0 ? null : Math.round(((today - yesterday) / yesterday) * 100);

  return NextResponse.json({
    type,
    counts,
    summary: { total, today, yesterday, changePct: change },
  });
}

/**
 * Overview rápido: contadores de hoy de cada tipo + cambio vs ayer.
 */
async function buildOverview() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setUTCDate(today.getUTCDate() - 1);

  const overview: Record<
    string,
    { today: number; yesterday: number; changePct: number | null }
  > = {};

  await Promise.all(
    VALID_TYPES.map(async (t) => {
      const [todayCount, yesterdayCount] = await Promise.all([
        countEventsForDay(t, today),
        countEventsForDay(t, yesterday),
      ]);
      overview[t] = {
        today: todayCount,
        yesterday: yesterdayCount,
        changePct:
          yesterdayCount === 0
            ? null
            : Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100),
      };
    })
  );

  return { overview, timestamp: new Date().toISOString() };
}
