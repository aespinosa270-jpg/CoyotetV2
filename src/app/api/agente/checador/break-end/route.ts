import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { breakId } = await req.json();

  if (!breakId)
    return NextResponse.json({ error: "Missing breakId" }, { status: 400 });

  const existing = await prisma.attendanceBreak.findUnique({ where: { id: breakId } });
  if (!existing)
    return NextResponse.json({ error: "Pausa no encontrada" }, { status: 404 });
  if (existing.endAt)
    return NextResponse.json({ error: "Pausa ya terminada" }, { status: 400 });

  const endAt    = new Date();
  const duration = parseFloat(
    ((endAt.getTime() - existing.startAt.getTime()) / 60000).toFixed(2)
  );

  const updated = await prisma.attendanceBreak.update({
    where: { id: breakId },
    data:  { endAt, duration },
  });

  return NextResponse.json({
    ...updated,
    startAt:   updated.startAt.toISOString(),
    endAt:     updated.endAt!.toISOString(),
    createdAt: updated.createdAt.toISOString(),
  });
}