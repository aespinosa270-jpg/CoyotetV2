import { prisma } from "@/lib/prisma";
import HorariosClient from "./_components/HorariosClient";

async function getHorariosData() {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    select: {
      id: true, name: true, role: true,
      attendances: {
        where: {
          checkIn: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        select: { checkIn: true, checkOut: true },
        orderBy: { checkIn: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  return employees.map((e) => ({
    id:       e.id,
    name:     e.name,
    role:     e.role,
    isOnline: e.attendances.length > 0 && e.attendances[0].checkOut == null,
    checkIn:  e.attendances[0]?.checkIn?.toISOString()  ?? null,
    checkOut: e.attendances[0]?.checkOut?.toISOString() ?? null,
  }));
}

export default async function HorariosPage() {
  const employees = await getHorariosData();

  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden">
      <div className="shrink-0">
        <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">Admin / Operación</p>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
          GESTIÓN DE <span className="text-[#FDCB02]">HORARIOS</span>
        </h1>
      </div>
      <HorariosClient employees={employees} />
    </div>
  );
}