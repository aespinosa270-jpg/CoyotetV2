import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PipelineClient from "./_components/PipelineClient";

async function getMiPipeline(employeeId: string) {
  const deals = await prisma.deal.findMany({
    where:   { employeeId },
    include: {
      product: { select: { id: true, title: true, sku: true } },
      user:    { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // KPIs
  const activos  = deals.filter((d) => !["CERRADO_GANADO","CERRADO_PERDIDO"].includes(d.status));
  const ganados  = deals.filter((d) => d.status === "CERRADO_GANADO");
  const perdidos = deals.filter((d) => d.status === "CERRADO_PERDIDO");
  const valorActivo  = activos.reduce((s, d) => s + d.value, 0);
  const valorGanado  = ganados.reduce((s, d) => s + d.value, 0);
  const winRate = ganados.length + perdidos.length > 0
    ? Math.round((ganados.length / (ganados.length + perdidos.length)) * 100)
    : 0;

  return {
    deals: deals.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      user: d.user
        ? { ...d.user, name: d.user.name ?? d.user.email }
        : null,
    })),
    kpis: { activos: activos.length, valorActivo, valorGanado, winRate },
  };
}

export default async function MiPipelinePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const employee = await prisma.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true },
  });
  if (!employee) redirect("/login");

  const { deals, kpis } = await getMiPipeline(employee.id);

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">Mi CRM / Pipeline</p>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
          Mi <span className="text-[#FDCB02]">Pipeline</span>
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        {[
          { label: "Deals Activos",   value: kpis.activos,                                                        color: "text-white"       },
          { label: "Valor en Juego",  value: `$${(kpis.valorActivo  / 1000).toFixed(0)}k`,                       color: "text-[#FDCB02]"  },
          { label: "Total Ganado",    value: `$${(kpis.valorGanado  / 1000).toFixed(0)}k`,                       color: "text-emerald-400" },
          { label: "Win Rate",        value: `${kpis.winRate}%`,                                                   color: "text-sky-400"     },
        ].map((k) => (
          <div key={k.label} className="bg-[#0a0a0a] border border-white/[0.03] p-4 rounded-2xl">
            <p className="text-[8px] uppercase font-black tracking-widest text-zinc-600 mb-1">{k.label}</p>
            <p className={`text-xl font-mono font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <PipelineClient deals={deals} />
    </div>
  );
}