import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { attendanceId, lat, lng, location } = await req.json();
  if (!attendanceId) return NextResponse.json({ error: "Missing attendanceId" }, { status: 400 });

  const existing = await prisma.attendance.findUnique({ where: { id: attendanceId } });
  if (!existing)        return NextResponse.json({ error: "Sesión no encontrada" },  { status: 404 });
  if (existing.checkOut) return NextResponse.json({ error: "Sesión ya cerrada" },    { status: 400 });

  const checkOut = new Date();
  const horasTrabajadas = parseFloat(
    ((checkOut.getTime() - existing.checkIn.getTime()) / 3600000).toFixed(2)
  );

  const updated = await prisma.attendance.update({
    where: { id: attendanceId },
    data:  { checkOut, horasTrabajadas, checkOutLat: lat, checkOutLng: lng },
  });

  return NextResponse.json({
    ...updated,
    checkIn:   updated.checkIn.toISOString(),
    checkOut:  updated.checkOut!.toISOString(),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}
