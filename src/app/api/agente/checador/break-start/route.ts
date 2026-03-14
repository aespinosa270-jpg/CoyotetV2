import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_TYPES = ["BANO", "LUNCH", "PEDIDO", "ENTRENAMIENTO"] as const;
type BreakType = typeof VALID_TYPES[number];

export async function POST(req: NextRequest) {
  const { attendanceId, type } = await req.json();

  if (!attendanceId || !type)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  if (!VALID_TYPES.includes(type as BreakType))
    return NextResponse.json({ error: `Tipo inválido. Válidos: ${VALID_TYPES.join(", ")}` }, { status: 400 });

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