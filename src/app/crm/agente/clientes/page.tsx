import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ClientesClient from "./_components/ClientesClient";
import { auth } from "@/auth";

async function getMisClientes(employeeId: string) {
  // Clientes únicos con los que este agente ha tenido deals
  const deals = await prisma.deal.findMany({
    where:   { employeeId, userId: { not: null } },
    select:  { userId: true, status: true, value: true },
  });

  const userIds = [...new Set(deals.map((d) => d.userId!))];

  const users = await prisma.user.findMany({
    where:   { id: { in: userIds } },
    select: {
      id:        true,
      name:      true,
      email:     true,
      phone:     true,
      createdAt: true,
      _count:    { select: { tickets: true, orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Enriquecer con stats de deals por cliente
  const enriched = users.map((u) => {
    const misDeals   = deals.filter((d) => d.userId === u.id);
    const ganados    = misDeals.filter((d) => d.status === "CERRADO_GANADO");
    const totalValue = ganados.reduce((s, d) => s + d.value, 0);
    return {
      ...u,
      createdAt:  u.createdAt.toISOString(),
      totalDeals: misDeals.length,
      ganados:    ganados.length,
      totalValue,
    };
  });

  const totalClientes  = enriched.length;
  const totalFacturado = enriched.reduce((s, u) => s + u.totalValue, 0);
  const conTickets     = enriched.filter((u) => u._count.tickets > 0).length;

  return { clientes: enriched, totalClientes, totalFacturado, conTickets };
}

export default async function MisClientesPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const employee = await prisma.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true },
  });
  if (!employee) redirect("/login");

  const { clientes, totalClientes, totalFacturado, conTickets } =
    await getMisClientes(employee.id);

  const fmtShort = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`;
    return `$${v}`;
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">Mi CRM / Clientes</p>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
          Mis <span className="text-[#FDCB02]">Clientes</span>
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 shrink-0">
        {[
          { label: "Total Clientes",    value: totalClientes,           color: "text-white"       },
          { label: "Facturado Total",   value: fmtShort(totalFacturado),color: "text-[#FDCB02]"  },
          { label: "Con Tickets",       value: conTickets,              color: "text-red-400"     },
        ].map((k) => (
          <div key={k.label} className="bg-[#0a0a0a] border border-white/[0.03] p-4 rounded-2xl">
            <p className="text-[8px] uppercase font-black tracking-widest text-zinc-600 mb-1">{k.label}</p>
            <p className={`text-xl font-mono font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <ClientesClient clientes={clientes} />
    </div>
  );
}