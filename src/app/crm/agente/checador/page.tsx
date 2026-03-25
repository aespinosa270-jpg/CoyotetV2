import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import CheckadorClient from "./_components/CheckadorClient";
import { auth } from "@/auth";

async function getMisAttendances(employeeId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [attendances, activeSession] = await Promise.all([
    prisma.attendance.findMany({
      where:   { employeeId },
      orderBy: { checkIn: "desc" },
      take:    30,
      include: { breaks: { orderBy: { startAt: "asc" } } },
    }),
    prisma.attendance.findFirst({
      where: {
        employeeId,
        checkIn:  { gte: today },
        checkOut: null,
      },
      include: { breaks: { orderBy: { startAt: "asc" } } },
    }),
  ]);

  // Stats
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthAttendances = attendances.filter(
    (a) => new Date(a.checkIn) >= thisMonth
  );
  const totalHorasMes  = monthAttendances.reduce((s, a) => s + (a.horasTrabajadas ?? 0), 0);
  const diasTrabajados = monthAttendances.filter((a) => a.checkOut).length;
  const promedioHoras  = diasTrabajados > 0 ? totalHorasMes / diasTrabajados : 0;

  return {
    attendances: attendances.map((a) => ({
      ...a,
      checkIn:   a.checkIn.toISOString(),
      checkOut:  a.checkOut?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      breaks:    a.breaks.map((b) => ({
        ...b,
        startAt:   b.startAt.toISOString(),
        endAt:     b.endAt?.toISOString() ?? null,
        createdAt: b.createdAt.toISOString(),
      })),
    })),
    activeSession: activeSession
      ? {
          ...activeSession,
          checkIn:   activeSession.checkIn.toISOString(),
          checkOut:  null,
          createdAt: activeSession.createdAt.toISOString(),
          updatedAt: activeSession.updatedAt.toISOString(),
          breaks:    activeSession.breaks.map((b) => ({
            ...b,
            startAt:   b.startAt.toISOString(),
            endAt:     b.endAt?.toISOString() ?? null,
            createdAt: b.createdAt.toISOString(),
          })),
        }
      : null,
    kpis: {
      totalHorasMes:  parseFloat(totalHorasMes.toFixed(1)),
      diasTrabajados,
      promedioHoras:  parseFloat(promedioHoras.toFixed(1)),
    },
  };
}

export default async function CheckadorPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const employee = await prisma.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true, name: true, role: true },
  });
  if (!employee) redirect("/login");

  const { attendances, activeSession, kpis } = await getMisAttendances(employee.id);

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">Mi CRM / Asistencia</p>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
          Reloj <span className="text-[#FDCB02]">Checador</span>
        </h1>
      </div>
      <CheckadorClient
        attendances={attendances}
        activeSession={activeSession}
        kpis={kpis}
        employee={employee}
      />
    </div>
  );
}