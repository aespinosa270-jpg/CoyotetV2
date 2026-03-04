import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import MisInteraccionesClient from "./_components/MisInteraccionesClient";

async function getMisInteracciones(employeeId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const interactions = await prisma.interaction.findMany({
    where:   { employeeId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { date: "desc" },
    take:    200,
  });

  const totalHoy      = interactions.filter((i) => new Date(i.date) >= today).length;
  const conFollowUp   = interactions.filter((i) => i.nextFollowUp).length;
  const contestadas   = interactions.filter((i) => i.summary?.length > 0).length;
  const tasaResp      = interactions.length > 0
    ? Math.round((contestadas / interactions.length) * 100)
    : 0;

  // Conteo por tipo
  const porTipo = interactions.reduce<Record<string, number>>((acc, i) => {
    acc[i.type] = (acc[i.type] ?? 0) + 1;
    return acc;
  }, {});

  return {
    interactions: interactions.map((i) => ({
      ...i,
      date:         i.date.toISOString(),
      nextFollowUp: i.nextFollowUp?.toISOString() ?? null,
      user: {
        ...i.user,
        name: i.user?.name ?? i.user?.email ?? "Cliente",
      },
    })),
    kpis: { totalHoy, conFollowUp, tasaResp, total: interactions.length },
    porTipo,
  };
}

export default async function MisInteraccionesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const employee = await prisma.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true },
  });
  if (!employee) redirect("/login");

  const { interactions, kpis, porTipo } = await getMisInteracciones(employee.id);

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">Mi CRM / Actividad</p>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
          Mis <span className="text-[#FDCB02]">Interacciones</span>
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        {[
          { label: "Hoy",             value: kpis.totalHoy,   color: "text-white"       },
          { label: "Total",           value: kpis.total,      color: "text-[#FDCB02]"  },
          { label: "Tasa Resumen",    value: `${kpis.tasaResp}%`, color: "text-emerald-400" },
          { label: "Con Follow-Up",   value: kpis.conFollowUp,color: "text-sky-400"     },
        ].map((k) => (
          <div key={k.label} className="bg-[#0a0a0a] border border-white/[0.03] p-4 rounded-2xl">
            <p className="text-[8px] uppercase font-black tracking-widest text-zinc-600 mb-1">{k.label}</p>
            <p className={`text-xl font-mono font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <MisInteraccionesClient interactions={interactions} porTipo={porTipo} />
    </div>
  );
}