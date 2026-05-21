/**
 * PATCH /api/admin/sourcing-queue/[id]
 *   Body: { sourcingStatus?, sourcingInternalNotes?, sourcingDays? }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../bot/_lib/guard";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["PENDING", "IN_PROGRESS", "RESOLVED", "FAILED"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await params;
  const body = await req.json();
  const data: any = {};

  if (body.sourcingStatus !== undefined) {
    if (!VALID_STATUSES.includes(body.sourcingStatus)) {
      return NextResponse.json(
        { error: `status invalido. Validos: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
    data.sourcingStatus = body.sourcingStatus;

    // Si se resuelve o falla, marcar timestamp
    if (body.sourcingStatus === "RESOLVED" || body.sourcingStatus === "FAILED") {
      data.sourcingResolvedAt = new Date();
    }
  }

  if (body.sourcingInternalNotes !== undefined) {
    data.sourcingInternalNotes = body.sourcingInternalNotes;
  }

  if (body.sourcingDays !== undefined && typeof body.sourcingDays === "number") {
    data.sourcingDays = body.sourcingDays;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
  }

  const order = await prisma.order.update({
    where: { id },
    data,
    select: {
      id: true,
      orderNumber: true,
      sourcingStatus: true,
      sourcingDays: true,
      sourcingResolvedAt: true,
      sourcingInternalNotes: true,
    },
  });

  return NextResponse.json({ order });
}