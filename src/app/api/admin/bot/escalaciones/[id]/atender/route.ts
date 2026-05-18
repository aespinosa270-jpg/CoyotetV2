/**
 * POST /api/admin/bot/escalaciones/[id]/atender
 *
 * Marca la escalación como atendida. NO libera el bot — el admin debe
 * usar el botón "Liberar control" del CRM cuando termine de atender.
 * (La pausa de Feature 3 sigue activa hasta que el admin la quite.)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../_lib/guard";
import { auth } from "@/auth";
import { marcarAtendida, getEscalation } from "@/lib/bot/repositories/escalation-repo";

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
  if (existing.estado !== "pendiente") {
    return NextResponse.json(
      { error: `Ya estaba ${existing.estado}` },
      { status: 409 }
    );
  }

  const updated = await marcarAtendida(id, adminEmail);
  if (!updated) {
    return NextResponse.json({ error: "fallo al actualizar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, escalation: updated });
}
