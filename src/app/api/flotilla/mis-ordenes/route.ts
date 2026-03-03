import { NextResponse } from "next/server";
import { getFlotillaSession } from "@/lib/flotilla-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getFlotillaSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: session.sub },
  });
  if (!employee) {
    return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [ordenes, entregasDelMes] = await Promise.all([
    prisma.routeOrder.findMany({
      where: {
        employeeId: employee.id,   // ✅ era assignedTo
        scheduledAt: { gte: hoy, lt: manana },
        status: { not: "CANCELADA" },
      },
      include: { items: true },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.routeOrder.count({
      where: {
        employeeId: employee.id,   // ✅ era assignedTo
        status: "COMPLETADA",
        completedAt: { gte: startOfMonth },
      },
    }),
  ]);

  return NextResponse.json({ employee, ordenes, entregasDelMes });
}