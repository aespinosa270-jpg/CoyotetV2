import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { lat, lng, speed, isSpeeding, employeeId } = await req.json();

    if (!employeeId || lat == null || lng == null) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    await prisma.telemetry.create({
      data: {
        employeeId,
        lat,
        lng,
        speed: speed ?? 0,
        isSpeeding: isSpeeding ?? false,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error telemetría:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
