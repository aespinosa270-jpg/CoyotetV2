import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { attendanceId, type } = await req.json();
  if (!attendanceId || !type)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  // Verificar que no haya break activo
  const existing = await prisma.attendanceBreak.findFirst({
    where: { attendanceId, endAt: null },
  });
  if (existing)
    return NextResponse.json({ error: "Ya hay una pausa activa" }, { status: 400 });

  const breakRecord = await prisma.attendanceBreak.create({
    data: { attendanceId, type, startAt: new Date() },
  });

  return NextResponse.json({
    ...breakRecord,
    startAt:   breakRecord.startAt.toISOString(),
    endAt:     null,
    createdAt: breakRecord.createdAt.toISOString(),
  });
}