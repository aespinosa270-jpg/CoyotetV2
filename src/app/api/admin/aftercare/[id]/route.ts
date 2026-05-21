/**
 * PATCH /api/admin/aftercare/[id]
 *   Body: { outcome, responseText?, applyTrustEvent? }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../bot/_lib/guard";
import { prisma } from "@/lib/prisma";
import { applyTrustDelta, type TrustEventType } from "@/lib/bot/services/trust/calculator";

const VALID_OUTCOMES = ["pending", "positive_response", "negative_response", "no_response", "complaint"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await params;
  const body = await req.json();

  if (body.outcome && !VALID_OUTCOMES.includes(body.outcome)) {
    return NextResponse.json({ error: "outcome invalido" }, { status: 400 });
  }

  const data: any = {};
  if (body.outcome !== undefined) data.outcome = body.outcome;
  if (body.responseText !== undefined) data.responseText = body.responseText;
  if (body.messageSent !== undefined) data.messageSent = body.messageSent;
  if (body.notas !== undefined) data.notas = body.notas;

  if (body.outcome && body.outcome !== "pending") {
    data.respondedAt = new Date();
  }

  const event = await prisma.aftercareEvent.update({
    where: { id },
    data,
    include: { user: true },
  });

  // Si outcome es positivo/complaint, aplicar delta trust
  let trustUpdate: any = null;
  if (body.applyTrustEvent && event.user) {
    const eventType =
      body.outcome === "positive_response"
        ? "aftercare_positive"
        : body.outcome === "complaint"
        ? "aftercare_complaint"
        : null;

    if (eventType) {
      trustUpdate = await applyTrustDelta({
        userId: event.user.id,
        eventType: eventType as TrustEventType,
        orderId: event.orderId ?? undefined,
        responseText: body.responseText,
      });
    }
  }

  return NextResponse.json({ event, trustUpdate });
}