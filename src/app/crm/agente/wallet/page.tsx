import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import WalletClient from "./_components/WalletClient";
import { auth } from "@/auth";

async function getMiWallet(employeeId: string) {
  const [commissions, employee] = await Promise.all([
    prisma.commission.findMany({
      where:   { employeeId },
      include: {
        deal: {
          select: {
            id:        true,
            title:     true,
            company:   true,
            value:     true,
            updatedAt: true,
            user:      { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findUnique({
      where:  { id: employeeId },
      select: { commissionRate: true },
    }),
  ]);

  const aprobadas  = commissions.filter((c) => c.status === "APROBADA");
  const pendientes = commissions.filter((c) => c.status === "PENDIENTE");
  const pagadas    = commissions.filter((c) => c.status === "PAGADA");
  const rechazadas = commissions.filter((c) => c.status === "RECHAZADA");

  const totalAprobado  = aprobadas.reduce((s, c)  => s + c.amount, 0);
  const totalPendiente = pendientes.reduce((s, c) => s + c.amount, 0);
  const totalPagado    = pagadas.reduce((s, c)    => s + c.amount, 0);

  // Historial mensual — últimos 6 meses
  const now = new Date();
  const porMes = Array.from({ length: 6 }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() - 4 + i, 0);
    const mes   = commissions.filter((c) => {
      const d = new Date(c.createdAt);
      return d >= start && d <= end && c.status !== "RECHAZADA";
    });
    return {
      label:  start.toLocaleDateString("es-MX", { month: "short" }),
      amount: mes.reduce((s, c) => s + c.amount, 0),
    };
  });

  return {
    commissions: commissions.map((c) => ({
      ...c,
      createdAt:  c.createdAt.toISOString(),
      updatedAt:  c.updatedAt.toISOString(),
      approvedAt: c.approvedAt?.toISOString() ?? null,
      paidAt:     c.paidAt?.toISOString()     ?? null,
      deal: {
        ...c.deal,
        updatedAt: c.deal.updatedAt.toISOString(),
        user: c.deal.user
          ? { ...c.deal.user, name: c.deal.user.name ?? c.deal.user.email }
          : null,
      },
    })),
    kpis: {
      totalAprobado,
      totalPendiente,
      totalPagado,
      totalComisiones: commissions.length,
      rate:            employee?.commissionRate ?? 0.03,
    },
    porMes,
  };
}

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const employee = await prisma.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true, name: true },
  });
  if (!employee) redirect("/login");

  const { commissions, kpis, porMes } = await getMiWallet(employee.id);

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">Mi CRM / Finanzas</p>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
          Mi <span className="text-[#FDCB02]">Wallet</span>
        </h1>
      </div>
      <WalletClient
        commissions={commissions}
        kpis={kpis}
        porMes={porMes}
        employeeName={employee.name}
      />
    </div>
  );
}