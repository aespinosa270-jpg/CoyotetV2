/**
 * POST /api/admin/bot/escalaciones/[id]/descartar
 *
 * Marca la escalación como falsa alarma. Útil cuando el detector se
 * disparó por error y el admin quiere que el bot retome la conversación.
 *
 * NOTA: este endpoint NO libera el pause automáticamente. El admin debe
 * decidir si liberar el bot desde el page de conversación.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../_lib/guard";
import { auth } from "@/auth";
import { marcarDescartada, getEscalation } from "@/lib/bot/repositories/escalation-repo";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const session = await auth();
  const adminEmail = session?.user?.email ?? "admin";

  const { id } = await params;

  const existing = await getEscalation(id);
  if (!existing) {
    return NextResponse.json({ error: "no encontrada" }, { status: 404 });
  }

  const updated = await marcarDescartada(id, adminEmail);
  if (!updated) {
    return NextResponse.json({ error: "fallo al actualizar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, escalation: updated });
}
