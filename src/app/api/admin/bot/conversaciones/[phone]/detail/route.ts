/**
 * GET /api/admin/bot/conversaciones/[phone]/detail
 *
 * Devuelve el detalle completo de una conversacion para el inbox unificado
 * (carga on-click sin navegar de pagina). Es ADITIVO: no toca ningun
 * endpoint existente. Reusa exactamente las mismas funciones de repo que
 * la pagina server [phone]/page.tsx, mas el estado de pausa para que el
 * composer y el TakeOverPanel sepan si el bot esta activo o en control humano.
 *
 * Respuesta:
 *   {
 *     perfil, historial, resumen, memoria, pedidos, topObjeciones,
 *     paused: boolean,
 *     pauseState: { pausedAt, pausedBy, lastAgentMessageAt } | null,
 *     ttlSeconds: number
 *   }
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "../../../_lib/guard";
import { getConversacionDetallada } from "@/lib/bot/repositories/admin-queries";
import {
  getPauseState,
  getPauseTTL,
  isBotPaused,
} from "@/lib/bot/repositories/pause-repo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { phone: phoneEncoded } = await params;
  const phone = decodeURIComponent(phoneEncoded);

  try {
    const [detalle, paused, pauseState, ttlSeconds] = await Promise.all([
      getConversacionDetallada(phone),
      isBotPaused(phone),
      getPauseState(phone),
      getPauseTTL(phone),
    ]);

    if (!detalle) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...detalle,
      paused,
      pauseState,
      ttlSeconds,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "detail failed", details: msg },
      { status: 500 }
    );
  }
}
