/**
 * GET /api/admin/bot/conversaciones/lista
 *
 * Devuelve la lista de conversaciones (resumenes) para que el inbox haga
 * polling en vivo y suene la notificacion cuando llega un mensaje nuevo.
 * Mismo origen de datos que la pagina (listConversaciones).
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "../../_lib/guard";
import { listConversaciones } from "@/lib/bot/repositories/admin-queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const { items } = await listConversaciones({ offset: 0, limit: 10000 });
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "No se pudo cargar la lista", details: msg }, { status: 500 });
  }
}
