// src/app/api/admin/flotilla/stats/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [entregadosEsteMes, enRuta] = await Promise.all([
    prisma.order.count({
      where: { logisticsType: "COYOTE_LOCAL", status: "DELIVERED", updatedAt: { gte: startOfMonth } },
    }),
    prisma.order.count({
      where: { logisticsType: "COYOTE_LOCAL", status: "SHIPPED" },
    }),
  ]);

  const mesActual = startOfMonth
    .toLocaleDateString("es-MX", { month: "long", year: "numeric" })
    .toUpperCase();

  return NextResponse.json({ entregadosEsteMes, enRuta, mesActual });
}