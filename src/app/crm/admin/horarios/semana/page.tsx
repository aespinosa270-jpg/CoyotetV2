import { prisma } from "@/lib/prisma";
import SemanaClient from "./_components/SemanaClient";

async function getSemanaData() {
  // Traer asistencias de la semana actual
  const hoy    = new Date();
  const diaSemana = hoy.getDay(); // 0=Dom
  const lunesOffset = diaSemana === 0 ? -6 : 1 - diaSemana;
  const lunes  = new Date(hoy);
  lunes.setDate(hoy.getDate() + lunesOffset);
  lunes.setHours(0, 0, 0, 0);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 7);

  const [employees, attendances] = await Promise.all([
    prisma.employee.findMany({
      where:   { isActive: true },
      select:  { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.attendance.findMany({
      where: {
        checkIn: { gte: lunes, lt: domingo },
      },
      include: {
        employee: { select: { id: true, name: true, role: true } },
      },
      orderBy: { checkIn: "asc" },
    }),
  ]);

  // Construir los 7 días de la semana
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(lunes);
    date.setDate(lunes.getDate() + i);
    return {
      date:    date.toISOString(),
      isToday: date.toDateString() === hoy.toDateString(),
      attendances: attendances
        .filter((a) => new Date(a.checkIn).toDateString() === date.toDateString())
        .map((a) => ({
          id:        a.id,
          checkIn:   a.checkIn.toISOString(),
          checkOut:  a.checkOut?.toISOString() ?? null,
          employee:  a.employee,
        })),
    };
  });

  return { days, employees };
}

export default async function SemanaCRMPage() {
  const { days, employees } = await getSemanaData();

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">Admin / Horarios</p>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
          VISTA <span className="text-[#FDCB02]">SEMANAL</span>
        </h1>
      </div>
      <SemanaClient days={days} employees={employees} />
    </div>
  );
}