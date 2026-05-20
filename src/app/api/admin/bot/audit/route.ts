/**
 * GET /api/admin/bot/audit
 *
 * Devuelve los últimos eventos del bot (Redis sorted sets) para
 * la página de auditoría/logs del CRM.
 *
 * Query params:
 *  - type: filtrar por tipo específico (message, error, conversion, etc.)
 *  - days: cuántos días atrás revisar (default 1, max 7)
 *  - limit: cuántos eventos por tipo (default 100, max 500)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_lib/guard";
import { getRecentEvents, type EventType } from "@/lib/bot/observability/events";

const ALL_TYPES: EventType[] = [
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

  const url = new URL(req.url);
  const typeParam = url.searchParams.get("type") as EventType | null;
  const daysParam = url.searchParams.get("days");
  const limitParam = url.searchParams.get("limit");

  const days = Math.min(7, Math.max(1, parseInt(daysParam || "1", 10) || 1));
  const limit = Math.min(500, Math.max(10, parseInt(limitParam || "100", 10) || 100));

  const types: EventType[] = typeParam ? [typeParam] : ALL_TYPES;

  try {
    // Para cada tipo, jalar eventos de los últimos N días
    const allEvents: Array<any> = [];
    const today = new Date();

    for (const type of types) {
      for (let d = 0; d < days; d++) {
        const date = new Date(today);
        date.setUTCDate(today.getUTCDate() - d);
        const events = await getRecentEvents(type, date, limit);
        for (const ev of events) {
          allEvents.push(ev);
        }
      }
    }

    // Ordenar todos del más reciente al más viejo
    allEvents.sort((a, b) => (b.ts || 0) - (a.ts || 0));

    // Aplicar limit global
    const trimmed = allEvents.slice(0, limit);

    return NextResponse.json({
      ok: true,
      count: trimmed.length,
      totalScanned: allEvents.length,
      events: trimmed,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}