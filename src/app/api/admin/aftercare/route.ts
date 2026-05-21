/**
 * GET /api/admin/aftercare
 *
 * Lista de AftercareEvents pendientes de aprobación + stats globales.
 * Query params:
 *   ?status=pending|positive_response|complaint|no_response|ALL
 *   ?type=post_delivery_7d|re_engagement_30d
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../bot/_lib/guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "pending";
  const type = searchParams.get("type") ?? "ALL";

  const where: any = {};
  if (status !== "ALL") where.outcome = status;
  if (type !== "ALL") where.type = type;

  const events = await prisma.aftercareEvent.findMany({
    where,
    orderBy: { triggeredAt: "asc" },
    take: 100,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          trustScore: true,
          trustEvents: true,
          ltv: true,
        },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
          total: true,
          customerName: true,
          deliveredAt: true,
        },
      },
    },
  });

  const stats = {
    pending: await prisma.aftercareEvent.count({ where: { outcome: "pending" } }),
    positiveResponse: await prisma.aftercareEvent.count({ where: { outcome: "positive_response" } }),
    complaint: await prisma.aftercareEvent.count({ where: { outcome: "complaint" } }),
    noResponse: await prisma.aftercareEvent.count({ where: { outcome: "no_response" } }),
    total: await prisma.aftercareEvent.count(),
  };

  return NextResponse.json({ events, stats });
}