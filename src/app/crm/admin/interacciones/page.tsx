import { prisma } from "@/lib/prisma";
import { BarChart3 } from "lucide-react";
import InteraccionesClient from "./_components/InteraccionesClient";

async function getInteraccionesData() {
  const [interactions, stats] = await Promise.all([
    prisma.interaction.findMany({
      include: {
        employee: { select: { id: true, name: true } },
        user:     { select: { id: true, name: true, email: true } },
      },
      orderBy: { date: "desc" },
      take: 200,
    }),

    prisma.interaction.groupBy({
      by: ["type"],
      _count: { id: true },
      where: {
        date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const totalHoy    = interactions.filter((i) => new Date(i.date) >= hoy).length;
  const contestadas = interactions.filter((i) => i.summary?.length > 0).length;
  const tasaResp    = interactions.length > 0
    ? Math.round((contestadas / interactions.length) * 100)
    : 0;

  return {
    interactions: interactions.map((i) => ({
      ...i,
      date:        i.date.toISOString(),
      nextFollowUp: i.nextFollowUp?.toISOString() ?? null,
    })),
    totalHoy,
    tasaResp,
  };
}

export default async function InteraccionesPage() {
  const { interactions, totalHoy, tasaResp } = await getInteraccionesData();

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-end justify-between shrink-0">
        <div>
          <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">CRM / Actividad</p>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
            Registro de <span className="text-[#FDCB02]">Interacciones</span>
          </h1>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        {[
          { label: "Interacciones Hoy", value: totalHoy,              color: "text-white"       },
          { label: "Total Registradas", value: interactions.length,   color: "text-[#FDCB02]"  },
          { label: "Tasa de Seguimiento", value: `${tasaResp}%`,      color: "text-emerald-400" },
          { label: "Con Follow-Up",
            value: interactions.filter((i) => i.nextFollowUp).length, color: "text-blue-400"    },
        ].map((s) => (
          <div key={s.label} className="bg-[#0a0a0a] border border-white/[0.03] p-4 rounded-2xl">
            <p className="text-[8px] uppercase font-black tracking-widest text-zinc-600 mb-1">{s.label}</p>
            <p className={`text-xl font-mono font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <InteraccionesClient interactions={interactions} />
    </div>
  );
}