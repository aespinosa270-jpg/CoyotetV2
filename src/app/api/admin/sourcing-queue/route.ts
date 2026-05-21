/**
 * GET /api/admin/sourcing-queue
 *
 * Devuelve las orders con requiresSourcing=true (cola operativa).
 * Query params:
 *   ?status=PENDING|IN_PROGRESS|RESOLVED|FAILED|ALL (default: PENDING+IN_PROGRESS)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../bot/_lib/guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "ACTIVE";

  const where: any = { requiresSourcing: true };

  if (status === "ACTIVE") {
    where.sourcingStatus = { in: ["PENDING", "IN_PROGRESS"] };
  } else if (status !== "ALL") {
    where.sourcingStatus = status;
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: [{ sourcingPromisedAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      orderNumber: true,
      total: true,
      status: true,
      customerName: true,
      customerPhone: true,
      sourcingStatus: true,
      sourcingDays: true,
      sourcingPromisedAt: true,
      sourcingResolvedAt: true,
      sourcingInternalNotes: true,
      createdAt: true,
      items: {
        select: { title: true, quantity: true, unit: true },
      },
    },
  });

  const enriched = orders.map((o) => {
    const totalKg = o.items
      .filter((i) => !i.unit || String(i.unit).toLowerCase().startsWith("kil"))
      .reduce((s, i) => s + (Number(i.quantity) || 0), 0);

    const diasTranscurridos = o.sourcingPromisedAt
      ? Math.floor((Date.now() - new Date(o.sourcingPromisedAt).getTime()) / 86400000)
      : 0;

    const diasRestantes = (o.sourcingDays ?? 0) - diasTranscurridos;

    return {
      ...o,
      totalKg,
      diasTranscurridos,
      diasRestantes,
      isOverdue: diasRestantes < 0 && o.sourcingStatus !== "RESOLVED",
    };
  });

  const counts = {
    pending: orders.filter((o) => o.sourcingStatus === "PENDING").length,
    inProgress: orders.filter((o) => o.sourcingStatus === "IN_PROGRESS").length,
    resolved: orders.filter((o) => o.sourcingStatus === "RESOLVED").length,
    failed: orders.filter((o) => o.sourcingStatus === "FAILED").length,
    total: orders.length,
  };

  return NextResponse.json({ orders: enriched, counts });
}