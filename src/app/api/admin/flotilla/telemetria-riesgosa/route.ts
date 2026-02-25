// src/app/api/admin/flotilla/telemetria-riesgosa/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const cincoMin = new Date(Date.now() - 5 * 60 * 1000);
  const data = await prisma.telemetry.findMany({
    where: { isSpeeding: true, timestamp: { gte: cincoMin } },
    include: { employee: { select: { name: true } } },
    orderBy: { timestamp: "desc" },
    distinct: ["employeeId"],
  });
  return NextResponse.json(data);
}