// src/app/api/admin/choferes/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const choferes = await prisma.employee.findMany({
    where: { role: "LOGISTICA", isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(choferes);
}