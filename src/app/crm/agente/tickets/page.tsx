import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import MisTicketsClient from "./_components/MisTicketsClient";

async function getMisTickets(employeeId: string) {
  const tickets = await prisma.ticket.findMany({
    where:   { employeeId },
    include: {
      user:  { select: { id: true, name: true, email: true } },
      order: { select: { id: true, orderNumber: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  const abiertos   = tickets.filter((t) => t.status === "ABIERTO").length;
  const enRevision = tickets.filter((t) => t.status === "EN_REVISION").length;
  const resueltos  = tickets.filter((t) => t.status === "RESUELTO" || t.status === "CERRADO").length;
  const urgentes   = tickets.filter((t) => t.priority === "URGENTE" && t.status === "ABIERTO").length;

  return {
    tickets: tickets.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      user: {
        ...t.user,
        name: t.user.name ?? t.user.email,
      },
    })),
    kpis: { abiertos, enRevision, resueltos, urgentes },
  };
}

export default async function MisTicketsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const employee = await prisma.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true },
  });
  if (!employee) redirect("/login");

  const { tickets, kpis } = await getMisTickets(employee.id);

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">Mi CRM / Soporte</p>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
          Mis <span className="text-red-400">Tickets</span>
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        {[
          { label: "Abiertos",    value: kpis.abiertos,   color: "text-red-400"     },
          { label: "En Revisión", value: kpis.enRevision, color: "text-amber-400"   },
          { label: "Resueltos",   value: kpis.resueltos,  color: "text-emerald-400" },
          { label: "Urgentes",    value: kpis.urgentes,   color: kpis.urgentes > 0 ? "text-red-500" : "text-zinc-600" },
        ].map((k) => (
          <div key={k.label} className="bg-[#0a0a0a] border border-white/[0.03] p-4 rounded-2xl">
            <p className="text-[8px] uppercase font-black tracking-widest text-zinc-600 mb-1">{k.label}</p>
            <p className={`text-xl font-mono font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <MisTicketsClient tickets={tickets} />
    </div>
  );
}