/**
 * GET /api/admin/bot/escalaciones
 *
 * Devuelve listado de escalaciones para el CRM.
 * Query params:
 *  - estado=pendiente|atendida|descartada
 *  - razon=queja|humano|alto_valor|retries|frustracion|facturacion
 *  - take=200 (default)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_lib/guard";
import {
  listEscalations,
  getEscalationStats,
} from "@/lib/bot/repositories/escalation-repo";
import type { RazonEscalacion } from "@/lib/bot/domain/escalation/types";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const url = new URL(req.url);
  const estado = url.searchParams.get("estado") ?? undefined;
  const razon = (url.searchParams.get("razon") ?? undefined) as
    | RazonEscalacion
    | undefined;
  const takeStr = url.searchParams.get("take");
  const take = takeStr ? Math.min(1000, parseInt(takeStr, 10)) : 200;

  try {
    const [items, stats] = await Promise.all([
      listEscalations({ estado, razon, take }),
      getEscalationStats(),
    ]);

    return NextResponse.json({ ok: true, items, stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
