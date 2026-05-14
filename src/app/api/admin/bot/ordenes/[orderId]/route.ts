/**
 * PATCH /api/admin/bot/ordenes/[orderId]
 * Body: { "status": "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" }
 *
 * Usado por logística desde el dashboard para avanzar el estado de despacho.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../_lib/guard";
import { updateOrderStatus } from "@/lib/bot/services/crm/order-creator";
import { auth } from "@/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { orderId } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const status = body.status;
  const valid = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "FAILED"];
  if (!valid.includes(status)) {
    return NextResponse.json(
      { error: `status inválido. Debe ser uno de: ${valid.join(", ")}` },
      { status: 400 }
    );
  }

  const session = await auth();
  const updatedBy = session?.user?.email ?? "admin";

  const result = await updateOrderStatus(orderId, status, updatedBy);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
