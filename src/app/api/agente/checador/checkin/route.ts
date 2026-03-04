import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { employeeId, lat, lng, location } = await req.json();
  if (!employeeId) return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });

  // Verificar que no haya sesión activa hoy
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.attendance.findFirst({
    where: { employeeId, checkIn: { gte: today }, checkOut: null },
  });
  if (existing) {
    return NextResponse.json({ error: "Ya tienes una sesión activa" }, { status: 400 });
  }

  const attendance = await prisma.attendance.create({
    data: { employeeId, lat, lng, location, checkIn: new Date() },
  });

  return NextResponse.json({
    ...attendance,
    checkIn:   attendance.checkIn.toISOString(),
    checkOut:  null,
    createdAt: attendance.createdAt.toISOString(),
    updatedAt: attendance.updatedAt.toISOString(),
  });
}